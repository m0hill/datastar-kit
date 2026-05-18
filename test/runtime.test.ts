import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import { h } from "../src/html.js"
import {
  catchMappedErrors,
  DatastarProtocol,
  ErrorMapperLive,
  LiveQueryHub,
  LiveQueryHubLive,
  requestRuntimeLayer,
  RequestContext,
  runtimeCoreLayer,
  SignalDecoder,
  ValidationError
} from "../src/runtime.js"

const CounterSignals = Schema.Struct({
  count: Schema.Number
})

const nativeRequest = (body: BodyInit, headers: HeadersInit = {}): HttpServerRequest.HttpServerRequest =>
  HttpServerRequest.fromWeb(new Request("http://localhost/increment?from=test", { method: "POST", headers, body }))

describe("Effect-native runtime services", () => {
  it("assembles protocol services from layers and config", async () => {
    const response = await Effect.runPromise(
      Effect.gen(function*() {
        const protocol = yield* DatastarProtocol
        return yield* protocol.page(h("main", {}, "Runtime"))
      }).pipe(
        Effect.provide(runtimeCoreLayer({ datastarScriptSrc: "/assets/datastar.js" }))
      )
    )

    const web = HttpServerResponse.toWeb(response)
    const html = await web.text()

    expect(web.status).toBe(200)
    expect(web.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(html).toContain("Runtime")
    expect(html).toContain('<script type="module" src="/assets/datastar.js"></script>')
  })

  it("derives request context and decodes signals through request-scoped services", async () => {
    const request = nativeRequest(JSON.stringify({ count: 4 }), { "datastar-request": "true" })

    const result = await Effect.runPromise(
      Effect.gen(function*() {
        const context = yield* RequestContext
        const decoder = yield* SignalDecoder
        const signals = yield* decoder.decode(CounterSignals)
        return {
          count: signals.count,
          isDatastar: context.isDatastar,
          method: context.method,
          path: context.url.pathname,
          search: context.url.searchParams.get("from")
        }
      }).pipe(
        Effect.provide(requestRuntimeLayer(), { local: true }),
        Effect.provideService(HttpServerRequest.HttpServerRequest, request)
      )
    )

    expect(result).toEqual({
      count: 4,
      isDatastar: true,
      method: "POST",
      path: "/increment",
      search: "test"
    })
  })

  it("maps typed framework errors to responses", async () => {
    const validation = await Effect.runPromise(
      catchMappedErrors(Effect.fail(new ValidationError("Name is required"))).pipe(
        Effect.provide(ErrorMapperLive)
      )
    )
    const validationResponse = HttpServerResponse.toWeb(validation)

    expect(validationResponse.status).toBe(400)
    expect(await validationResponse.text()).toBe("Name is required")

    const badSignals = nativeRequest(JSON.stringify({ count: "bad" }))
    const decoded = await Effect.runPromise(
      catchMappedErrors(
        Effect.gen(function*() {
          const decoder = yield* SignalDecoder
          yield* decoder.decode(CounterSignals)
          return yield* (yield* DatastarProtocol).noContent()
        })
      ).pipe(
        Effect.provide(requestRuntimeLayer(), { local: true }),
        Effect.provideService(HttpServerRequest.HttpServerRequest, badSignals)
      )
    )
    const decodedResponse = HttpServerResponse.toWeb(decoded)

    expect(decodedResponse.status).toBe(400)
    expect(await decodedResponse.text()).toBe("Invalid request input")
  })

  it("scopes live query hubs and shuts them down with the layer scope", async () => {
    let hub!: typeof LiveQueryHub.Service

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function*() {
          hub = yield* LiveQueryHub
          expect(yield* hub.isShutdown).toBe(false)
        }).pipe(Effect.provide(LiveQueryHubLive()))
      )
    )

    await expect(Effect.runPromise(hub.isShutdown)).resolves.toBe(true)
  })

  it("uses live query hub invalidations as scoped streams", async () => {
    const collected = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function*() {
          const hub = yield* LiveQueryHub
          const values = hub.invalidations.pipe(Stream.take(2), Stream.runCollect)
          yield* hub.publish("first")
          yield* hub.publish("second")
          return yield* values
        }).pipe(Effect.provide(LiveQueryHubLive({ replay: 2 })))
      )
    )

    expect(collected).toEqual(["first", "second"])
  })

  it("keeps missing service dependencies in the Effect context type", async () => {
    const requiresProtocol: Effect.Effect<string, never, DatastarProtocol> = Effect.gen(function*() {
      const protocol = yield* DatastarProtocol
      const response = yield* protocol.noContent()
      return String(response.status)
    })

    if (false) {
      // @ts-expect-error The DatastarProtocol service must be provided before running this handler.
      Effect.runPromise(requiresProtocol)
    }

    await expect(
      Effect.runPromise(requiresProtocol.pipe(Effect.provide(runtimeCoreLayer())))
    ).resolves.toBe("204")
  })
})
