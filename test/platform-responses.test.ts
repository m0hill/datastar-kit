import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { h, raw } from "../src/html.js"
import * as reply from "../src/reply.js"
import { closePlatformListeners, makePlatformListener } from "./platform-listener.js"

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

describe("reply SSE responses", () => {
  it("serves Datastar SSE streams", async () => {
    const router = Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
      HttpRouter.route(
        "GET",
        "/events",
        Effect.succeed(reply.stream(["event: ready\n\n"], { headers: { "x-sse": "yes" } }))
      )
    ])))
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/events`)

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(response.headers.get("cache-control")).toBe("no-cache")
    expect(response.headers.get("x-sse")).toBe("yes")
    expect(await response.text()).toBe("event: ready\n\n")
  })

  it("serves Datastar signal patch responses", async () => {
    const router = Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
      HttpRouter.route(
        "GET",
        "/signals",
        Effect.succeed(reply.signals({ count: 1 }, undefined, { headers: { "x-signals": "yes" } }))
      )
    ])))
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/signals`)

    expect(response.headers.get("x-signals")).toBe("yes")
    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":1}\n\n')
  })

  it("renders HTML nodes in element patches", async () => {
    const router = Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
      HttpRouter.route(
        "GET",
        "/elements",
        Effect.succeed(reply.patch(h("span", {}, "Ada & Grace"), { selector: "#name" }))
      )
    ])))
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/elements`)

    expect(await response.text()).toBe(
      "event: datastar-patch-elements\ndata: selector #name\ndata: elements <span>Ada &amp; Grace</span>\n\n"
    )
  })

  it("escapes string patches unless raw HTML is explicit", async () => {
    const text = HttpServerResponse.toWeb(reply.patch("<strong>Saved</strong>"))
    const html = HttpServerResponse.toWeb(reply.patch(raw("<strong>Saved</strong>")))

    expect(await text.text()).toBe(
      "event: datastar-patch-elements\ndata: elements &lt;strong&gt;Saved&lt;/strong&gt;\n\n"
    )
    expect(await html.text()).toBe(
      "event: datastar-patch-elements\ndata: elements <strong>Saved</strong>\n\n"
    )
  })

  it("streams Effect Stream SSE responses", async () => {
    const router = Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
      HttpRouter.route(
        "GET",
        "/live",
        Effect.succeed(reply.stream(Stream.make("event: first\n\n", "event: second\n\n")))
      )
    ])))
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/live`)

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe("event: first\n\nevent: second\n\n")
  })

  it("streams Effect Stream responses with headers", async () => {
    const router = Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
      HttpRouter.route(
        "GET",
        "/stream-meta",
        Effect.succeed(reply.stream(Stream.make("event: meta\n\n"), { headers: { "x-stream": "effect" } }))
      )
    ])))
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/stream-meta`)

    expect(response.status).toBe(200)
    expect(response.headers.get("x-stream")).toBe("effect")
    expect(response.headers.get("cache-control")).toBe("no-cache")
    expect(await response.text()).toBe("event: meta\n\n")
  })
})
