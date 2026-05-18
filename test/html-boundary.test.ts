import { describe, expect, it } from "vitest"
import { dataSignals, on, post, signal, text } from "../src/datastar.js"
import {
  attrs,
  h,
  htmlRenderer,
  mergeOrderedAttrs,
  MissingPatchIdError,
  patchableNode,
  rawHtml,
  render,
  requirePatchId,
  type Renderer
} from "../src/html.js"

const stringRenderer: Renderer<string> = {
  render: (value) => value.toUpperCase()
}

describe("HTML rendering boundary", () => {
  it("exposes a renderer interface and default HTML renderer", () => {
    expect(stringRenderer.render("ok")).toBe("OK")
    expect(htmlRenderer.render(h("strong", {}, "Safe"))).toBe("<strong>Safe</strong>")
  })

  it("escapes text by default and requires explicit raw HTML", () => {
    expect(render(h("p", {}, "<script>alert(1)</script>"))).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"
    )
    expect(render(h("p", {}, rawHtml("<strong>trusted</strong>")))).toBe("<p><strong>trusted</strong></p>")
  })

  it("preserves explicit attribute order for Datastar-sensitive attributes", () => {
    const node = h(
      "main",
      attrs(
        ["data-signals__ifmissing", '{"count": 0}'],
        ["data-computed:double", "() => $count * 2"],
        ["data-text", "$double"]
      )
    )

    expect(render(node)).toBe(
      '<main data-signals__ifmissing="{&quot;count&quot;: 0}" data-computed:double="() =&gt; $count * 2" data-text="$double"></main>'
    )
  })

  it("can merge record attributes into explicit ordered attributes", () => {
    const node = h(
      "button",
      mergeOrderedAttrs({ type: "button" }, on("click", post("/save")), { disabled: true }),
      "Save"
    )

    expect(render(node)).toBe(
      '<button type="button" data-on:click="@post(&quot;/save&quot;)" disabled>Save</button>'
    )
  })

  it("provides patchable node helpers that encourage top-level ids", () => {
    const name = signal<string, "name">("name")
    const node = patchableNode("section", "profile", mergeOrderedAttrs(dataSignals({ name: "Ada" }), text(name)), "Ada")

    expect(requirePatchId(node)).toBe(node)
    expect(render(node)).toBe(
      '<section id="profile" data-signals="{&quot;name&quot;: &quot;Ada&quot;}" data-text="$name">Ada</section>'
    )
    expect(() => requirePatchId(h("section", {}, "No id"))).toThrow(MissingPatchIdError)
  })
})
