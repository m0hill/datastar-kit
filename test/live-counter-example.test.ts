import * as Effect from "effect/Effect"
import * as PubSub from "effect/PubSub"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { countFragment, createLiveCounter, makeLiveCounterScoped, pageView } from "../examples/live-counter.js"
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

    expect(await body).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">0</output>\n\n' +
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    )
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
    expect(html).toContain('<script type="module" src="/datastar.js"></script>')
    expect(increment.status).toBe(204)
    expect(liveCounter.currentCount()).toBe(1)
  })

  it("renders current backend state on live reconnect without requiring missed deltas", async () => {
    const liveCounter = createLiveCounter()

    await Effect.runPromise(liveCounter.increment)

    const liveResponse = await Effect.runPromise(liveCounter.live)
    const reader = HttpServerResponse.toWeb(liveResponse).body?.getReader()

    expect(reader).toBeDefined()

    const first = await reader!.read()
    expect(first.done).toBe(false)
    expect(new TextDecoder().decode(first.value)).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    )

    await reader!.cancel()
    await Effect.runPromise(liveCounter.shutdown)
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

    const decoder = new TextDecoder()
    let received = ""
    for (let i = 0; i < 3 && !received.includes('<output id="count">1</output>'); i++) {
      const chunk = await reader!.read()
      expect(chunk.done).toBe(false)
      received += decoder.decode(chunk.value)
    }

    const initialPatch = 'event: datastar-patch-elements\ndata: elements <output id="count">0</output>\n\n'
    const updatedPatch = 'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    expect(received).toContain(initialPatch)
    expect(received).toContain(updatedPatch)
    expect(received.indexOf(initialPatch)).toBeLessThan(received.indexOf(updatedPatch))

    await Effect.runPromise(liveCounter.shutdown)
    await expect(reader!.read()).resolves.toEqual({ done: true, value: undefined })
  })
})
