import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { countFragment, createLiveCounter, pageView } from "../examples/live-counter.js"

describe("live counter example", () => {
  it("renders a page that opens a Datastar SSE stream", () => {
    expect(pageView()).toContain('data-init="@get(&quot;/live&quot;)"')
  })

  it("renders count fragments for fat morph patches", () => {
    expect(countFragment(3)).toBe('<output id="count">3</output>')
  })

  it("publishes increments to live SSE subscribers", async () => {
    const liveCounter = createLiveCounter()
    const liveResponse = await Effect.runPromise(liveCounter.live(new Request("http://localhost/live")))
    const body = liveResponse.text()

    await Effect.runPromise(liveCounter.increment(new Request("http://localhost/increment", { method: "POST" })))
    await Effect.runPromise(liveCounter.broadcaster.closeAll())

    expect(await body).toBe('event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n')
    expect(liveCounter.currentCount()).toBe(1)
  })

  it("dispatches page and increment routes", async () => {
    const liveCounter = createLiveCounter()
    const page = await Effect.runPromise(liveCounter.app(new Request("http://localhost/")))
    const increment = await Effect.runPromise(liveCounter.app(new Request("http://localhost/increment", { method: "POST" })))
    const html = await page.text()

    expect(page.status).toBe(200)
    expect(html).toContain("<!doctype html>")
    expect(html).toContain("live-counter")
    expect(html).toContain('<script type="module" src="/datastar.js"></script>')
    expect(increment.status).toBe(204)
    expect(liveCounter.currentCount()).toBe(1)
  })
})
