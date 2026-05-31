import { describe, expect, it } from "vitest"
import { dataSignals, signal, text } from "../src/ds/index.js"
import { h, HtmlNameError, mergeProps, renderToString, unsafeHtml } from "../src/html.js"
import { page } from "../src/reply.js"

describe("HTML rendering boundary", () => {
  it("escapes text by default and requires explicit unsafe HTML", () => {
    expect(renderToString(h("p", {}, "<script>alert(1)</script>"))).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"
    )
    expect(renderToString(h("p", {}, unsafeHtml("<strong>trusted</strong>")))).toBe(
      "<p><strong>trusted</strong></p>"
    )
  })

  it("rejects unsafe tag and rendered attribute names", () => {
    expect(() => h('div onclick="alert(1)"')).toThrow(HtmlNameError)

    expect(() => renderToString(h("button", { 'data-x" onclick="alert(1)': true }))).toThrow(
      HtmlNameError
    )

    expect(renderToString(h("button", { 'data-x" onclick="alert(1)': false }))).toBe(
      "<button></button>"
    )
  })

  it("composes props with later values overriding earlier values", () => {
    expect(mergeProps({ class: "base", id: "old" }, { id: "new", hidden: true })).toEqual({
      class: "base",
      id: "new",
      hidden: true
    })
  })

  it("renders composed Datastar props in object insertion order", () => {
    const count = signal<number, "count">("count")
    const node = h(
      "main",
      mergeProps({ id: "counter" }, dataSignals({ count: 0 }, { ifMissing: true }), text(count)),
      "0"
    )

    expect(renderToString(node)).toBe(
      '<main id="counter" data-signals__ifmissing="{&quot;count&quot;: 0}" data-text="$count">0</main>'
    )
  })

  it("renders child arrays and full pages", async () => {
    expect(renderToString([h("span", {}, "A"), h("span", {}, "B")])).toBe(
      "<span>A</span><span>B</span>"
    )
    await expect(page(h("main", {}, "Hello")).text()).resolves.toBe(
      '<!doctype html><html lang="en"><head></head><body><main>Hello</main></body></html>'
    )
  })

  it("keeps stable patch ids as plain explicit props", () => {
    const node = h("section", { id: "profile" }, "Ada")

    expect(node.props.id).toBe("profile")
    expect(renderToString(node)).toBe('<section id="profile">Ada</section>')
  })
})
