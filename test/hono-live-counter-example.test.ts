import { describe, expect, it } from "vitest"
import { makeHonoLiveCounter } from "../examples/hono-live-counter.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

describe("Hono live counter integration example", () => {
  it("uses Hono routes around the live counter recipe", async () => {
    const counter = makeHonoLiveCounter()

    const page = await counter.handle(new Request("http://localhost/"))
    const html = await page.text()
    expect(page.status).toBe(200)
    expect(html).toContain("live-counter")
    expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)

    const live = await counter.handle(new Request("http://localhost/live"))
    const reader = live.body?.getReader()
    expect(live.headers.get("content-type")).toBe("text/event-stream")
    expect(reader).toBeDefined()

    const decoder = new TextDecoder()
    const initial = await reader!.read()
    expect(initial.done).toBe(false)
    expect(decoder.decode(initial.value)).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">0</output>\n\n'
    )

    const updated = reader!.read()
    const increment = await counter.handle(new Request("http://localhost/increment", { method: "POST" }))
    expect(increment.status).toBe(204)
    expect(counter.currentCount()).toBe(1)

    const next = await updated
    expect(next.done).toBe(false)
    expect(decoder.decode(next.value)).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    )

    counter.shutdown()
    await expect(reader!.read()).resolves.toEqual({ done: true, value: undefined })
  })
})
