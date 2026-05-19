import { describe, expect, it } from "vitest"
import { dataSignals, signal, text } from "../src/ds.js"
import { fragment, h, page, props, render, unsafeHtml } from "../src/html.js"

describe("HTML rendering boundary", () => {
  it("escapes text by default and requires explicit unsafe HTML", () => {
    expect(render(h("p", {}, "<script>alert(1)</script>"))).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"
    )
    expect(render(h("p", {}, unsafeHtml("<strong>trusted</strong>")))).toBe("<p><strong>trusted</strong></p>")
  })

  it("composes props with later values overriding earlier values", () => {
    expect(props({ class: "base", id: "old" }, { id: "new", hidden: true })).toEqual({
      class: "base",
      id: "new",
      hidden: true
    })
  })

  it("renders composed Datastar props in object insertion order", () => {
    const count = signal<number, "count">("count")
    const node = h(
      "main",
      props(
        { id: "counter" },
        dataSignals({ count: 0 }, { ifMissing: true }),
        text(count)
      ),
      "0"
    )

    expect(render(node)).toBe(
      '<main id="counter" data-signals__ifmissing="{&quot;count&quot;: 0}" data-text="$count">0</main>'
    )
  })

  it("renders fragments and full pages", () => {
    expect(render(fragment(h("span", {}, "A"), h("span", {}, "B")))).toBe("<span>A</span><span>B</span>")
    expect(page({ body: h("main", {}, "Hello") })).toBe(
      '<!doctype html><html lang="en"><head></head><body><main>Hello</main></body></html>'
    )
  })

  it("keeps stable patch ids as plain explicit props", () => {
    const node = h("section", { id: "profile" }, "Ada")

    expect(node.props.id).toBe("profile")
    expect(render(node)).toBe('<section id="profile">Ada</section>')
  })
})
