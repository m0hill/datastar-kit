import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { h } from "../src/html.js"
import {
  platformHtmlPatchResponse,
  platformHtmlResponse,
  platformJsonSignalsResponse,
  platformRouter,
  platformScriptResponse
} from "../src/platform.js"
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

describe("native Effect Platform direct Datastar responses", () => {
  it("serves native platform HTML node responses", async () => {
    const router = platformRouter(
      HttpRouter.route(
        "GET",
        "/html",
        Effect.succeed(platformHtmlResponse(h("main", {}, "Ada & Grace"), { status: 201, headers: { "x-html": "yes" } }))
      )
    )
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/html`)

    expect(response.status).toBe(201)
    expect(response.headers.get("content-type")).toContain("text/html")
    expect(response.headers.get("x-html")).toBe("yes")
    expect(await response.text()).toBe("<main>Ada &amp; Grace</main>")
  })

  it("serves native platform direct HTML patch responses", async () => {
    const router = platformRouter(
      HttpRouter.route(
        "GET",
        "/patch",
        Effect.succeed(platformHtmlPatchResponse(h("p", {}, "Updated"), {
          selector: "#slot",
          mode: "inner",
          namespace: "svg",
          useViewTransition: true
        }))
      )
    )
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/patch`)

    expect(response.headers.get("datastar-selector")).toBe("#slot")
    expect(response.headers.get("datastar-mode")).toBe("inner")
    expect(response.headers.get("datastar-namespace")).toBe("svg")
    expect(response.headers.get("datastar-use-view-transition")).toBe("true")
    expect(await response.text()).toBe("<p>Updated</p>")
  })

  it("serves native platform JSON signal responses", async () => {
    const router = platformRouter(
      HttpRouter.route(
        "GET",
        "/signals",
        Effect.succeed(platformJsonSignalsResponse({ count: 1 }, { onlyIfMissing: true, status: 202 }))
      )
    )
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/signals`)

    expect(response.status).toBe(202)
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8")
    expect(response.headers.get("datastar-only-if-missing")).toBe("true")
    expect(await response.text()).toBe('{"count":1}')
  })

  it("serves native platform script responses", async () => {
    const router = platformRouter(
      HttpRouter.route(
        "GET",
        "/script",
        Effect.succeed(platformScriptResponse("console.log('hello')", { attributes: { type: "module", async: true } }))
      )
    )
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/script`)

    expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8")
    expect(response.headers.get("datastar-script-attributes")).toBe('{"type":"module","async":true}')
    expect(await response.text()).toBe("console.log('hello')")
  })
})
