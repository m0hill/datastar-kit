import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { platformCounterNode, platformCounterRouter, platformPage } from "../examples/platform-counter.js"
import { render } from "../src/html.js"
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

describe("platform counter example", () => {
  it("renders a platform counter node", () => {
    const html = render(platformCounterNode())

    expect(html).toContain('id="platform-counter"')
    expect(html).toContain('data-on:click="@post(&quot;/increment&quot;)"')
  })

  it("returns a native platform page response", async () => {
    const webResponse = HttpServerResponse.toWeb(platformPage())

    expect(webResponse.status).toBe(200)
    expect(await webResponse.text()).toContain("ts-star platform counter")
  })

  it("increments through the native platform action handler", async () => {
    const listener = await makePlatformListener(platformCounterRouter)
    const origin = await serveListener(listener)
    const response = await fetch(`${origin}/increment`, {
      method: "POST",
      body: JSON.stringify({ count: 4 })
    })

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":5}\n\n')
  })

  it("handles bad native platform signal payloads explicitly", async () => {
    const listener = await makePlatformListener(platformCounterRouter)
    const origin = await serveListener(listener)
    const response = await fetch(`${origin}/increment`, {
      method: "POST",
      body: JSON.stringify({ count: "bad" })
    })

    expect(response.status).toBe(400)
    expect(await response.text()).toBe("Bad signals")
  })

  it("dispatches native platform counter routes", async () => {
    const listener = await makePlatformListener(platformCounterRouter)
    const origin = await serveListener(listener)
    const response = await fetch(origin)

    expect(response.status).toBe(200)
    expect(await response.text()).toContain("ts-star platform counter")
  })
})
