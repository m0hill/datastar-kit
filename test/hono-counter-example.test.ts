import { describe, expect, it } from "vitest"
import { makeHonoCounter } from "../examples/hono-counter.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

describe("Hono counter integration example", () => {
  it("uses Hono as an application framework around Web Standards responses", async () => {
    const counter = makeHonoCounter()

    const page = await counter.handle(new Request("http://localhost/"))
    const html = await page.text()
    expect(page.status).toBe(200)
    expect(html).toContain("ts-star counter")
    expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)

    const increment = await counter.handle(new Request("http://localhost/increment", { method: "POST" }))
    expect(increment.status).toBe(200)
    expect(counter.currentCount()).toBe(1)
    expect(await increment.text()).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    )
  })
})
