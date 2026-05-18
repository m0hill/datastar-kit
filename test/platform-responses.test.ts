import * as HttpRouter from "@effect/platform/HttpRouter"
import { NodeHttpServer } from "@effect/platform-node"
import * as Effect from "effect/Effect"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { h } from "../src/html.js"
import {
  platformEventStreamResponse,
  platformPatchElementsResponse,
  platformPatchSignalsResponse,
  platformSseResponse
} from "../src/platform.js"

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
})

async function* events(): AsyncIterable<string> {
  yield "event: first\n\n"
  yield "event: second\n\n"
}

describe("native Effect Platform Datastar responses", () => {
  it("serves native platform SSE responses", async () => {
    const router = HttpRouter.get(
      HttpRouter.empty,
      "/events",
      Effect.succeed(platformSseResponse(["event: ready\n\n"], { status: 202, headers: { "x-sse": "yes" } }))
    )
    const listener = await Effect.runPromise(NodeHttpServer.makeHandler(router))
    const response = await fetch(`${await serveListener(listener)}/events`)

    expect(response.status).toBe(202)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(response.headers.get("cache-control")).toBe("no-cache")
    expect(response.headers.get("x-sse")).toBe("yes")
    expect(await response.text()).toBe("event: ready\n\n")
  })

  it("serves native platform Datastar patch responses", async () => {
    const router = HttpRouter.get(
      HttpRouter.empty,
      "/signals",
      Effect.succeed(platformPatchSignalsResponse({ count: 1 }, undefined, { headers: { "x-signals": "yes" } }))
    )
    const listener = await Effect.runPromise(NodeHttpServer.makeHandler(router))
    const response = await fetch(`${await serveListener(listener)}/signals`)

    expect(response.headers.get("x-signals")).toBe("yes")
    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":1}\n\n')
  })

  it("renders HTML nodes in native platform element patches", async () => {
    const router = HttpRouter.get(
      HttpRouter.empty,
      "/elements",
      Effect.succeed(platformPatchElementsResponse(h("span", {}, "Ada & Grace"), { selector: "#name" }))
    )
    const listener = await Effect.runPromise(NodeHttpServer.makeHandler(router))
    const response = await fetch(`${await serveListener(listener)}/elements`)

    expect(await response.text()).toBe(
      "event: datastar-patch-elements\ndata: selector #name\ndata: elements <span>Ada &amp; Grace</span>\n\n"
    )
  })

  it("streams native platform async SSE responses", async () => {
    const router = HttpRouter.get(HttpRouter.empty, "/live", Effect.succeed(platformEventStreamResponse(events())))
    const listener = await Effect.runPromise(NodeHttpServer.makeHandler(router))
    const response = await fetch(`${await serveListener(listener)}/live`)

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe("event: first\n\nevent: second\n\n")
  })
})
