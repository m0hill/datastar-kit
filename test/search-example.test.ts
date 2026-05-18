import { describe, expect, it } from "vitest"
import { handle, resultsView, searchPage, searchView } from "../examples/search.js"
import * as ds from "../src/ds.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

describe("search example", () => {
  it("supports dynamic Datastar action URLs", () => {
    const q = ds.signal<string, "q">("q")

    expect(ds.get(ds.queryUrl("/search", { q })).toDatastarExpression()).toBe("@get(`/search?q=${encodeURIComponent($q)}`)")
  })

  it("renders a search shell with debounced Datastar requests", () => {
    expect(searchView()).toContain('data-on:input__debounce.200ms="@get(`/search?q=${encodeURIComponent($q)}`)"')
  })

  it("returns a native search page with an explicit Datastar client script", async () => {
    const html = await searchPage().text()

    expect(html).toContain("<!doctype html>")
    expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)
    expect(html).toContain('id="search"')
  })

  it("renders filtered result rows and empty states", () => {
    expect(resultsView("ada")).toBe('<tbody id="results"><tr><td>Ada</td><td>Lovelace</td></tr></tbody>')
    expect(resultsView("nobody")).toBe('<tbody id="results"><tr><td colspan="2">No contacts found</td></tr></tbody>')
  })

  it("dispatches the fetch-compatible example handler", async () => {
    const response = handle(new Request("http://localhost/search?q=grace"))

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe(
      'event: datastar-patch-elements\ndata: selector #results\ndata: elements <tbody id="results"><tr><td>Grace</td><td>Hopper</td></tr></tbody>\n\n'
    )
  })
})
