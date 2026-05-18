import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import {
  AuthContextLive,
  CsrfError,
  navigationScript,
  readLimitedText,
  requestAbortSignal,
  requireContentLengthAtMost,
  requireCsrfToken,
  requireUser,
  RequestSizeLimitError,
  safeRedirectUrl,
  UnsafeRedirectUrlError
} from "../src/security.js"
import { catchMappedErrors, ErrorMapper, requestRuntimeLayer, RequestContext } from "../src/runtime.js"

const request = (method: string, body?: BodyInit, headers: HeadersInit = {}): HttpServerRequest.HttpServerRequest =>
  HttpServerRequest.fromWeb(new Request("http://localhost/action", {
    method,
    headers,
    ...(body === undefined ? {} : { body })
  }))

const runWithRequest = <A, E>(
  effect: Effect.Effect<A, E, RequestContext | ErrorMapper>,
  req: HttpServerRequest.HttpServerRequest
): Promise<A> =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(requestRuntimeLayer(), { local: true }),
      Effect.provideService(HttpServerRequest.HttpServerRequest, req)
    )
  )

describe("request security boundaries", () => {
  it("requires CSRF tokens for unsafe methods but not safe methods by default", async () => {
    await expect(runWithRequest(requireCsrfToken("secret"), request("GET"))).resolves.toBeUndefined()
    await expect(runWithRequest(requireCsrfToken("secret"), request("POST", "", { "x-csrf-token": "secret" }))).resolves.toBeUndefined()
    await expect(runWithRequest(requireCsrfToken("secret"), request("POST"))).rejects.toBeInstanceOf(CsrfError)
    await expect(runWithRequest(requireCsrfToken("secret"), request("POST", "", { "x-csrf-token": "wrong" }))).rejects.toBeInstanceOf(CsrfError)
  })

  it("maps security errors through the runtime error mapper", async () => {
    const response = await runWithRequest(
      catchMappedErrors(requireCsrfToken("secret").pipe(Effect.as(HttpServerResponse.empty()))),
      request("POST")
    )
    const web = HttpServerResponse.toWeb(response)

    expect(web.status).toBe(403)
    expect(await web.text()).toBe("CSRF check failed")
  })

  it("flows auth/session data through Effect context", async () => {
    const user = await Effect.runPromise(
      requireUser<{ readonly id: string }>().pipe(
        Effect.provide(AuthContextLive({ user: { id: "u1" }, session: { id: "s1" } }))
      )
    )

    expect(user).toEqual({ id: "u1" })
    await expect(Effect.runPromise(requireUser().pipe(Effect.provide(AuthContextLive({}))))).rejects.toThrow("Unauthorized")
  })

  it("enforces request content-length and post-read body limits", async () => {
    await expect(runWithRequest(requireContentLengthAtMost(4), request("POST", "12345", { "content-length": "5" }))).rejects.toBeInstanceOf(RequestSizeLimitError)
    await expect(runWithRequest(readLimitedText(4), request("POST", "1234"))).resolves.toBe("1234")
    await expect(runWithRequest(readLimitedText(4), request("POST", "12345"))).rejects.toBeInstanceOf(RequestSizeLimitError)
  })

  it("exposes Web request abort signals when available", async () => {
    const controller = new AbortController()
    const req = HttpServerRequest.fromWeb(new Request("http://localhost/slow", { signal: controller.signal }))
    const signal = await runWithRequest(requestAbortSignal, req)

    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal?.aborted).toBe(false)
    controller.abort()
    expect(signal?.aborted).toBe(true)
  })

  it("rejects unsafe redirect/navigation URLs", () => {
    expect(safeRedirectUrl("/next?ok=1")).toBe("/next?ok=1")
    expect(safeRedirectUrl("https://example.com/path", { baseUrl: "https://example.com" })).toBe("/path")
    expect(safeRedirectUrl("https://elsewhere.test/path", { allowExternal: true })).toBe("https://elsewhere.test/path")
    expect(navigationScript("/next")).toBe('window.location.href = "/next"')

    expect(() => safeRedirectUrl("javascript:alert(1)")).toThrow(UnsafeRedirectUrlError)
    expect(() => safeRedirectUrl("https://evil.test/phish")).toThrow(UnsafeRedirectUrlError)
    expect(() => safeRedirectUrl("/bad\nLocation: https://evil.test")).toThrow(UnsafeRedirectUrlError)
  })
})
