import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { h } from "../src/html.js"
import { platformRouter } from "../src/platform.js"
import * as reply from "../src/reply.js"
import { closePlatformListeners, makePlatformListener } from "./platform-listener.js"

if (false) {
  // @ts-expect-error Datastar action body replies only accept HTTP 200.
  reply.direct.signals({ count: 1 }, { status: 202 })
  // @ts-expect-error Datastar no-content replies only accept HTTP 204.
  reply.done({ status: 200 })
}

let server: Server | undefined

const serveListener = async (listener: RequestListener): Promise<string> => {
  server = createServer(listener)
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

afterEach(async () => {
  const current = server
  server = undefined
  if (current !== undefined) {
    await new Promise<void>((resolve, reject) => current.close((error) => error ? reject(error) : resolve()))
  }
  await closePlatformListeners()
})

describe("reply direct Datastar responses", () => {
  it("serves full Datastar pages with normal page status options", async () => {
    const router = platformRouter(
      HttpRouter.route(
        "GET",
        "/html",
        Effect.succeed(reply.page(h("main", {}, "Ada & Grace"), { status: 201, headers: { "x-html": "yes" } }))
      )
    )
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/html`)

    expect(response.status).toBe(201)
    expect(response.headers.get("content-type")).toContain("text/html")
    expect(response.headers.get("x-html")).toBe("yes")
    expect(await response.text()).toContain("<main>Ada &amp; Grace</main>")
  })

  it("serves direct HTML patch responses as explicit escape hatches", async () => {
    const router = platformRouter(
      HttpRouter.route(
        "GET",
        "/patch",
        Effect.succeed(reply.direct.html(h("p", {}, "Updated"), {
          selector: "#slot",
          mode: "inner",
          namespace: "svg",
          useViewTransition: true
        }))
      )
    )
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/patch`)

    expect(response.status).toBe(200)
    expect(response.headers.get("datastar-selector")).toBe("#slot")
    expect(response.headers.get("datastar-mode")).toBe("inner")
    expect(response.headers.get("datastar-namespace")).toBe("svg")
    expect(response.headers.get("datastar-use-view-transition")).toBe("true")
    expect(await response.text()).toBe("<p>Updated</p>")
  })

  it("serves direct JSON signal responses as explicit escape hatches", async () => {
    const router = platformRouter(
      HttpRouter.route(
        "GET",
        "/signals",
        Effect.succeed(reply.direct.signals({ count: 1 }, { onlyIfMissing: true }))
      )
    )
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/signals`)

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8")
    expect(response.headers.get("datastar-only-if-missing")).toBe("true")
    expect(await response.text()).toBe('{"count":1}')
  })

  it("serves direct script responses as explicit escape hatches", async () => {
    const router = platformRouter(
      HttpRouter.route(
        "GET",
        "/script",
        Effect.succeed(reply.direct.script("console.log('hello')", { attributes: { type: "module", async: true } }))
      )
    )
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/script`)

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8")
    expect(response.headers.get("datastar-script-attributes")).toBe('{"type":"module","async":true}')
    expect(await response.text()).toBe("console.log('hello')")
  })

  it("serves safe navigation script responses", async () => {
    const router = platformRouter(
      HttpRouter.route(
        "GET",
        "/navigate",
        Effect.succeed(reply.navigate("/dashboard?from=login#top", { baseUrl: "https://app.example" }))
      )
    )
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/navigate`)

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8")
    expect(await response.text()).toBe('window.location.href = "/dashboard?from=login#top"')
  })

  it("allows navigation to explicit origin allowlists only", async () => {
    const response = HttpServerResponse.toWeb(reply.navigate("https://docs.example/start", {
      baseUrl: "https://app.example",
      allowedOrigins: ["https://docs.example"]
    }))

    expect(await response.text()).toBe('window.location.href = "https://docs.example/start"')
    expect(() => reply.navigate("https://evil.example/phish", { baseUrl: "https://app.example" })).toThrow(reply.NavigationUrlError)
    expect(() => reply.navigate("javascript:alert(1)", { baseUrl: "https://app.example" })).toThrow(reply.NavigationUrlError)
    expect(() => reply.navigate("/safe\nSet-Cookie: bad", { baseUrl: "https://app.example" })).toThrow(reply.NavigationUrlError)
  })

  it("keeps Datastar action replies on 200-with-body or 204-without-body status semantics", async () => {
    const router = platformRouter(
      HttpRouter.route("GET", "/signals", Effect.succeed(reply.direct.signals({ count: 1 }, { status: 200 }))),
      HttpRouter.route("POST", "/empty", Effect.succeed(reply.done({ status: 204 })))
    )
    const listener = await makePlatformListener(router)
    const base = await serveListener(listener)

    const signals = await fetch(`${base}/signals`)
    expect(signals.status).toBe(200)
    expect(signals.headers.get("content-type")).toBe("application/json; charset=utf-8")
    expect(await signals.text()).toBe('{"count":1}')

    const empty = await fetch(`${base}/empty`, { method: "POST" })
    expect(empty.status).toBe(204)
    expect(await empty.text()).toBe("")

    expect(() => reply.direct.signals({ count: 1 }, { status: 202 as 200 })).toThrow(reply.ResponseStatusError)
    expect(() => reply.done({ status: 200 as 204 })).toThrow(reply.ResponseStatusError)
  })
})
