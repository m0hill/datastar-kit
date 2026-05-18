import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { app, counterView, page } from "../examples/counter.js"
import { DATASTAR_CDN } from "../src/client.js"
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

describe("counter example", () => {
  it("renders a Datastar counter view", () => {
    expect(counterView()).toContain('data-signals__ifmissing="{&quot;count&quot;: 0}"')
    expect(counterView()).toContain('data-on:click="@post(&quot;/increment&quot;)"')
  })

  it("returns a native page that loads the Datastar client", async () => {
    const response = HttpServerResponse.toWeb(page())
    const html = await response.text()

    expect(html).toContain("<!doctype html>")
    expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)
  })

  it("dispatches the native example app routes", async () => {
    const listener = await makePlatformListener(app)
    const origin = await serveListener(listener)
    const pageResponse = await fetch(origin)
    const incrementResponse = await fetch(`${origin}/increment`, {
      method: "POST",
      body: JSON.stringify({ count: 12 })
    })

    expect(pageResponse.status).toBe(200)
    expect(await pageResponse.text()).toContain("ts-star counter")
    expect(await incrementResponse.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":13}\n\n')
  })

  it("handles bad native signal payloads explicitly", async () => {
    const listener = await makePlatformListener(app)
    const origin = await serveListener(listener)
    const response = await fetch(`${origin}/increment`, {
      method: "POST",
      body: JSON.stringify({ count: "bad" })
    })

    expect(response.status).toBe(400)
    expect(await response.text()).toBe("Bad signals")
  })
})
