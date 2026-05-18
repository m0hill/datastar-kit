import { describe, expect, it } from "vitest"
import { get, queryUrl, signal } from "../src/ds.js"

describe("dynamic URL helpers", () => {
  it("builds encoded query URL expressions from signals", () => {
    const q = signal<string, "q">("q")

    expect(queryUrl("/search", { q }).toDatastarExpression()).toBe("`/search?q=${encodeURIComponent($q)}`")
  })

  it("uses ampersands when the path already has a query string", () => {
    const page = signal<number, "page">("page")

    expect(queryUrl("/search?sort=name", { page }).toDatastarExpression()).toBe(
      "`/search?sort=name&page=${encodeURIComponent($page)}`"
    )
  })

  it("supports static query values", () => {
    expect(queryUrl("/search", { q: "ada", page: 2 }).toDatastarExpression()).toBe(
      '`/search?q=${encodeURIComponent("ada")}&page=${encodeURIComponent(2)}`'
    )
  })

  it("composes with backend actions", () => {
    const q = signal<string, "q">("q")

    expect(get(queryUrl("/search", { q })).toDatastarExpression()).toBe(
      "@get(`/search?q=${encodeURIComponent($q)}`)"
    )
  })
})
