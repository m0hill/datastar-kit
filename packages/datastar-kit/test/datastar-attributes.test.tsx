import { describe, expect, it } from "vitest"
import { preserve, signal } from "../src/ds/index.js"
import { HtmlNameError, renderToString } from "../src/html.js"
import { jsx as runtimeJsx } from "../src/jsx-runtime.js"

// Datastar behavior is checked against the real runtime in test/browser. This file covers what the
// browser suite cannot observe: server-side rejection, and attributes that only exist in
// Datastar Pro, which the vendored open-source bundle does not include.
const renderAttribute = (name: string, value: unknown): string =>
  renderToString(runtimeJsx("div", { [name]: value }))

describe("Datastar attribute rendering", () => {
  it.each([
    "data-ignore-morph",
    "data-persist",
    "data-persist:profile",
    "data-query-string",
    "data-scope-children",
    "data-scroll-into-view"
  ])("renders the Pro attribute %s as a presence attribute", (name) => {
    expect(renderAttribute(name, true)).toBe(`<div ${name}></div>`)
    expect(renderAttribute(name, false)).toBe("<div></div>")
  })

  it("serializes structured values on custom data attributes for app plugins", () => {
    expect(renderAttribute("data-tooltip", { text: "Hi", at: signal("anchor") })).toBe(
      '<div data-tooltip="{&quot;text&quot;: &quot;Hi&quot;, &quot;at&quot;: $anchor}"></div>'
    )
  })

  it("rejects expressions and objects on non-data attributes", () => {
    expect(() => runtimeJsx("output", { id: signal<number>("count") })).toThrow(
      'Unsupported JSX prop value for "id"'
    )
    expect(() => runtimeJsx("div", { title: { text: "Hi" } })).toThrow(
      'Unsupported JSX prop value for "title"'
    )
  })
})

describe("preserve", () => {
  it("joins attribute names for data-preserve-attr", () => {
    expect(preserve("open", "class")).toBe("open class")
  })

  it("rejects names that would corrupt the attribute list", () => {
    expect(() => preserve("open", "bad name")).toThrow(HtmlNameError)
    expect(() => preserve("data-ok", "bad=attr")).toThrow(HtmlNameError)
  })
})
