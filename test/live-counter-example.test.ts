import { describe, expect, it } from "vitest"
import { makeLiveCounter } from "../examples/live-counter.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"
const decoder = new TextDecoder()

describe("live counter recipe example", () => {
  it("renders a page that opens a Datastar SSE stream", async () => {
    const liveCounter = makeLiveCounter()

    try {
      const response = liveCounter.handle(new Request("http://localhost/"))
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(html).toContain("<!doctype html>")
      expect(html).toContain("live-counter")
      expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)
      expect(html).toContain('data-init="@get(&quot;/live&quot;)"')
      expect(html).toContain('<output id="count">0</output>')
    } finally {
      liveCounter.shutdown()
    }
  })

  it("publishes increments to live SSE subscribers", async () => {
    const liveCounter = makeLiveCounter()
    const live = liveCounter.handle(new Request("http://localhost/live"))
    const reader = live.body!.getReader()

    const initial = await reader.read()
    expect(initial.done).toBe(false)
    expect(decoder.decode(initial.value)).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">0</output>\n\n'
    )

    const updated = reader.read()
    const increment = liveCounter.handle(new Request("http://localhost/increment", { method: "POST" }))

    expect(increment.status).toBe(204)

    const next = await updated
    expect(next.done).toBe(false)
    expect(decoder.decode(next.value)).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    )
    expect(liveCounter.currentCount()).toBe(1)

    liveCounter.shutdown()
    await expect(reader.read()).resolves.toEqual({ done: true, value: undefined })
  })

  it("renders current backend state on live reconnect without requiring missed deltas", async () => {
    const liveCounter = makeLiveCounter()

    liveCounter.handle(new Request("http://localhost/increment", { method: "POST" }))

    const live = liveCounter.handle(new Request("http://localhost/live"))
    const reader = live.body?.getReader()

    expect(reader).toBeDefined()

    const first = await reader!.read()
    expect(first.done).toBe(false)
    expect(decoder.decode(first.value)).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    )

    await reader!.cancel()
    liveCounter.shutdown()
  })

  it("streams live counter updates through the fetch-compatible handler", async () => {
    const liveCounter = makeLiveCounter()
    const live = liveCounter.handle(new Request("http://localhost/live"))
    const reader = live.body?.getReader()

    expect(live.headers.get("content-type")).toBe("text/event-stream")
    expect(reader).toBeDefined()

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

  it("returns a normal 404 response for unknown routes", async () => {
    const liveCounter = makeLiveCounter()
    const response = liveCounter.handle(new Request("http://localhost/missing"))

    expect(response.status).toBe(404)
    expect(await response.text()).toBe("Not Found")
    liveCounter.shutdown()
  })
})
