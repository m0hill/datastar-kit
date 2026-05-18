import * as Effect from "effect/Effect"
import * as PubSub from "effect/PubSub"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { countFragment, createLiveCounter, makeLiveCounterScoped, pageView } from "../examples/live-counter.js"
import { DATASTAR_CDN } from "../src/client.js"
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

describe("live counter example", () => {
  it("renders a page that opens a Datastar SSE stream", () => {
    expect(pageView()).toContain('data-init="@get(&quot;/live&quot;)"')
  })

  it("keeps count fragments as composable HTML nodes", () => {
    const fragment = countFragment(3)

    expect(fragment.tag).toBe("output")
    expect(fragment.attrs).toEqual({ id: "count" })
  })

  it("renders count fragments for fat morph patches", () => {
    expect(render(countFragment(3))).toBe('<output id="count">3</output>')
  })

  it("publishes increments to live SSE subscribers", async () => {
    const liveCounter = createLiveCounter()
    const liveResponse = await Effect.runPromise(liveCounter.live)
    const body = HttpServerResponse.toWeb(liveResponse).text()

    await Effect.runPromise(liveCounter.increment)
    await Effect.runPromise(liveCounter.shutdown)

    expect(await body).toBe('event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n')
    expect(liveCounter.currentCount()).toBe(1)
  })

  it("shuts down scoped live counter PubSub with its Effect scope", async () => {
    const liveCounter = await Effect.runPromise(Effect.scoped(makeLiveCounterScoped()))

    await expect(Effect.runPromise(PubSub.isShutdown(liveCounter.updates))).resolves.toBe(true)
  })

  it("dispatches page and increment routes", async () => {
    const liveCounter = createLiveCounter()
    const listener = await makePlatformListener(liveCounter.app)
    const origin = await serveListener(listener)
    const page = await fetch(origin)
    const increment = await fetch(`${origin}/increment`, { method: "POST" })
    const html = await page.text()

    expect(page.status).toBe(200)
    expect(html).toContain("<!doctype html>")
    expect(html).toContain("live-counter")
    expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)
    expect(increment.status).toBe(204)
    expect(liveCounter.currentCount()).toBe(1)
  })

  it("streams live counter updates through node:http", async () => {
    const liveCounter = createLiveCounter()
    const listener = await makePlatformListener(liveCounter.app)
    const origin = await serveListener(listener)
    const liveResponsePromise = fetch(`${origin}/live`)
    const increment = await fetch(`${origin}/increment`, { method: "POST" })
    const liveResponse = await liveResponsePromise
    const reader = liveResponse.body?.getReader()

    expect(liveResponse.headers.get("content-type")).toBe("text/event-stream")
    expect(reader).toBeDefined()
    expect(increment.status).toBe(204)

    const first = await reader!.read()
    expect(first.done).toBe(false)
    expect(new TextDecoder().decode(first.value)).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    )

    await Effect.runPromise(liveCounter.shutdown)
    await expect(reader!.read()).resolves.toEqual({ done: true, value: undefined })
  })
})
