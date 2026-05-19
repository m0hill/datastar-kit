import { describe, expect, it } from "vitest"
import { handle } from "../examples/search.js"
import * as ds from "../src/ds.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

describe("search example", () => {
  it("supports dynamic Datastar action URLs", () => {
    const q = ds.signal<string, "q">("q")

    expect(ds.get(ds.queryUrl("/search", { q })).toDatastarExpression()).toBe("@get(`/search?q=${encodeURIComponent($q)}`)")
  })

  it("renders a search page with debounced Datastar requests", async () => {
    const response = handle(new Request("http://localhost/"))
    const html = await response.text()

    expect(response.status).toBe(200)
    expect(html).toContain("<!doctype html>")
    expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)
    expect(html).toContain('id="search"')
    expect(html).toContain('data-on:input__debounce.200ms="@get(`/search?q=${encodeURIComponent($q)}`)"')
  })

  it("patches filtered result rows", async () => {
    const response = handle(new Request("http://localhost/search?q=grace"))

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe(
      'event: datastar-patch-elements\ndata: selector #results\ndata: elements <tbody id="results"><tr><td>Grace</td><td>Hopper</td></tr></tbody>\n\n'
    )
  })

  it("patches an empty state when no contacts match", async () => {
    const response = handle(new Request("http://localhost/search?q=nobody"))

    expect(await response.text()).toBe(
      'event: datastar-patch-elements\ndata: selector #results\ndata: elements <tbody id="results"><tr><td colspan="2">No contacts found</td></tr></tbody>\n\n'
    )
  })

  it("returns a normal 404 response for unknown routes", async () => {
    const response = handle(new Request("http://localhost/missing"))

    expect(response.status).toBe(404)
    expect(await response.text()).toBe("Not Found")
  })
})
