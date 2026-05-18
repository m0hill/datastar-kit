import { describe, expect, it } from "vitest"
import { counterView, makeCounter, page } from "../examples/counter.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

describe("counter example", () => {
  it("renders a Datastar counter view", () => {
    expect(counterView()).toContain('<output id="count">0</output>')
    expect(counterView()).toContain('data-on:click="@post(&quot;/increment&quot;)"')
  })

  it("returns a native page with an explicit Datastar client script", async () => {
    const response = page()
    const html = await response.text()

    expect(html).toContain("<!doctype html>")
    expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)
  })

  it("dispatches the fetch-compatible example handler", async () => {
    const counter = makeCounter()
    const pageResponse = counter.handle(new Request("http://localhost/"))
    const incrementResponse = counter.handle(new Request("http://localhost/increment", { method: "POST" }))

    expect(pageResponse.status).toBe(200)
    expect(await pageResponse.text()).toContain("ts-star counter")
    expect(await incrementResponse.text()).toBe(
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">1</output>\n\n'
    )
  })

  it("keeps backend state authoritative over stale client signal payloads", async () => {
    const counter = makeCounter()
    const response = counter.handle(new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: 999 })
    }))

    expect(response.status).toBe(200)
    expect(counter.currentCount()).toBe(1)
    expect(await response.text()).toBe(
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">1</output>\n\n'
    )
  })
})
