import { describe, expect, it } from "vitest"
import { makeTsxCounter } from "../examples/tsx-counter.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

describe("TSX counter example", () => {
  it("renders a Datastar counter page with TSX", async () => {
    const counter = makeTsxCounter()
    const response = counter.handle(new Request("http://localhost/"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain("<!doctype html>")
    expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)
    expect(html).toContain('id="tsx-counter"')
    expect(html).toContain("Datastar Kit TSX counter")
    expect(html).toContain('<button type="button" data-on:click="@post(&quot;/increment&quot;)">+</button>')
    expect(html).toContain('<output id="count">0</output>')
  })

  it("dispatches the increment action", async () => {
    const counter = makeTsxCounter()
    const response = counter.handle(new Request("http://localhost/increment", { method: "POST" }))

    expect(response.status).toBe(200)
    expect(counter.currentCount()).toBe(1)
    expect(await response.text()).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    )
  })

  it("keeps backend state authoritative over stale client signal payloads", async () => {
    const counter = makeTsxCounter()
    const response = counter.handle(new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: 999 })
    }))

    expect(response.status).toBe(200)
    expect(counter.currentCount()).toBe(1)
    expect(await response.text()).toBe(
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    )
  })

  it("returns a normal 404 response for unknown routes", async () => {
    const counter = makeTsxCounter()
    const response = counter.handle(new Request("http://localhost/missing"))

    expect(response.status).toBe(404)
    expect(await response.text()).toBe("Not Found")
  })
})
