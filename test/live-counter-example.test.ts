import { describe, expect, it } from "vitest"
import { countFragment, createLiveCounter, pageView } from "../examples/live-counter.js"
import { render } from "../src/html.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

describe("live counter recipe example", () => {
  it("renders a page that opens a Datastar SSE stream", () => {
    expect(pageView()).toContain('data-init="@get(&quot;/live&quot;)"')
  })

  it("keeps count fragments as composable HTML nodes", () => {
    const fragment = countFragment(3)

    expect(typeof fragment).toBe("object")
    expect(render(fragment)).toBe('<output id="count">3</output>')
  })

  it("publishes increments to live SSE subscribers", async () => {
    const liveCounter = createLiveCounter()
    const reader = liveCounter.live().body!.getReader()
    const decoder = new TextDecoder()

    const initial = await reader.read()
    expect(initial.done).toBe(false)
    expect(decoder.decode(initial.value)).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">0</output>\n\n'
    )

    const updated = reader.read()
    liveCounter.increment()

    const next = await updated
    expect(next.done).toBe(false)
    expect(decoder.decode(next.value)).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    )
    expect(liveCounter.currentCount()).toBe(1)

    liveCounter.shutdown()
    await expect(reader.read()).resolves.toEqual({ done: true, value: undefined })
  })

  it("dispatches page and increment routes", async () => {
    const liveCounter = createLiveCounter()
    const page = liveCounter.handle(new Request("http://localhost/"))
    const increment = liveCounter.handle(new Request("http://localhost/increment", { method: "POST" }))
    const html = await page.text()

    expect(page.status).toBe(200)
    expect(html).toContain("<!doctype html>")
    expect(html).toContain("live-counter")
    expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)
    expect(increment.status).toBe(204)
    expect(liveCounter.currentCount()).toBe(1)
    liveCounter.shutdown()
  })

  it("renders current backend state on live reconnect without requiring missed deltas", async () => {
    const liveCounter = createLiveCounter()

    liveCounter.increment()

    const reader = liveCounter.live().body?.getReader()

    expect(reader).toBeDefined()

    const first = await reader!.read()
    expect(first.done).toBe(false)
    expect(new TextDecoder().decode(first.value)).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    )

    await reader!.cancel()
    liveCounter.shutdown()
  })

  it("streams live counter updates through the fetch-compatible handler", async () => {
    const liveCounter = createLiveCounter()
    const liveResponse = liveCounter.handle(new Request("http://localhost/live"))
    const reader = liveResponse.body?.getReader()

    expect(liveResponse.headers.get("content-type")).toBe("text/event-stream")
    expect(reader).toBeDefined()

    const decoder = new TextDecoder()
    const initial = await reader!.read()
    expect(initial.done).toBe(false)
    let received = decoder.decode(initial.value)

    const updated = reader!.read()
    const increment = liveCounter.handle(new Request("http://localhost/increment", { method: "POST" }))
    expect(increment.status).toBe(204)

    const chunk = await updated
    expect(chunk.done).toBe(false)
    received += decoder.decode(chunk.value)

    const initialPatch = 'event: datastar-patch-elements\ndata: elements <output id="count">0</output>\n\n'
    const updatedPatch = 'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    expect(received).toContain(initialPatch)
    expect(received).toContain(updatedPatch)
    expect(received.indexOf(initialPatch)).toBeLessThan(received.indexOf(updatedPatch))

    liveCounter.shutdown()
    await expect(reader!.read()).resolves.toEqual({ done: true, value: undefined })
  })
})
