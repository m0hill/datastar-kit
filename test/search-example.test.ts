import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { app, resultsView, searchRoute, searchView } from "../examples/search.js"
import { get, raw } from "../src/datastar.js"

describe("search example", () => {
  it("supports dynamic Datastar action URLs", () => {
    expect(get(raw<string>("`/search?q=${encodeURIComponent($q)}`")).toDatastarExpression()).toBe(
      "@get(`/search?q=${encodeURIComponent($q)}`)"
    )
  })

  it("renders a search shell with debounced Datastar requests", () => {
    expect(searchView()).toContain('data-on:input__debounce.200ms="@get(`/search?q=${encodeURIComponent($q)}`)"')
  })

  it("renders filtered result rows", () => {
    expect(resultsView("ada")).toBe('<tbody id="results"><tr><td>Ada</td><td>Lovelace</td></tr></tbody>')
  })

  it("returns a direct HTML patch response from the query-decoded search route", async () => {
    const response = await Effect.runPromise(searchRoute.handler(new Request("http://localhost/search?q=grace")))

    expect(response.headers.get("datastar-selector")).toBe("#results")
    expect(response.headers.get("datastar-mode")).toBe("outer")
    expect(await response.text()).toBe('<tbody id="results"><tr><td>Grace</td><td>Hopper</td></tr></tbody>')
  })

  it("dispatches the example app", async () => {
    const response = await Effect.runPromise(app(new Request("http://localhost/search?q=edsger")))

    expect(response.status).toBe(200)
    expect(await response.text()).toContain("Dijkstra")
  })
})
