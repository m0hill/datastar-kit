import { describe, expect, it } from "vitest"
import { HtmlNameError, htmlNode, renderToString, unsafeHtml } from "../src/html.js"

describe("HTML rendering boundary", () => {
  it("escapes text by default and requires explicit unsafe HTML", () => {
    expect(renderToString(htmlNode("p", {}, "<script>alert(1)</script>"))).toBe(
      "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>"
    )
    expect(renderToString(htmlNode("p", {}, unsafeHtml("<strong>trusted</strong>")))).toBe(
      "<p><strong>trusted</strong></p>"
    )
  })

  it("escapes attribute values so they cannot break out of the quoted value", () => {
    expect(
      renderToString(htmlNode("a", { title: `" onmouseover="alert(1)' <&>`, tabindex: 0 }))
    ).toBe('<a title="&quot; onmouseover=&quot;alert(1)&#39; &lt;&amp;&gt;" tabindex="0"></a>')
  })

  it("omits null and undefined attributes", () => {
    expect(renderToString(htmlNode("a", { href: null, title: undefined, id: "" }))).toBe(
      '<a id=""></a>'
    )
  })

  it("rejects unsafe tag and rendered attribute names", () => {
    expect(() => htmlNode('div onclick="alert(1)"')).toThrow(HtmlNameError)

    expect(() => renderToString(htmlNode("button", { 'data-x" onclick="alert(1)': true }))).toThrow(
      HtmlNameError
    )

    expect(() =>
      renderToString(htmlNode("button", { 'data-x" onclick="alert(1)': false }))
    ).toThrow(HtmlNameError)
  })

  it("renders boolean attributes as presence-only attributes", () => {
    expect(renderToString(htmlNode("button", { disabled: true }, "Save"))).toBe(
      "<button disabled>Save</button>"
    )
    expect(renderToString(htmlNode("button", { disabled: false }, "Save"))).toBe(
      "<button>Save</button>"
    )
    expect(renderToString(htmlNode("details", { open: true }))).toBe("<details open></details>")
    expect(renderToString(htmlNode("details", { open: false }))).toBe("<details></details>")
    expect(renderToString(htmlNode("a", { download: true }, "Download"))).toBe(
      "<a download>Download</a>"
    )
    expect(renderToString(htmlNode("a", { download: "report.csv" }, "Download"))).toBe(
      '<a download="report.csv">Download</a>'
    )
    expect(renderToString(htmlNode("input", { type: "file", capture: false }))).toBe(
      '<input type="file">'
    )
    expect(renderToString(htmlNode("input", { DISABLED: true }))).toBe("<input DISABLED>")
  })

  it("renders boolean values on string-valued attributes", () => {
    expect(renderToString(htmlNode("div", { "aria-hidden": false, "aria-expanded": true }))).toBe(
      '<div aria-hidden="false" aria-expanded="true"></div>'
    )
    expect(renderToString(htmlNode("div", { draggable: false, contenteditable: true }))).toBe(
      '<div draggable="false" contenteditable="true"></div>'
    )
    expect(renderToString(htmlNode("div", { "data-enabled": false, "data-active": true }))).toBe(
      '<div data-enabled="false" data-active="true"></div>'
    )
  })

  it("renders boolean children as empty strings", () => {
    expect(renderToString(true)).toBe("")
    expect(renderToString(false)).toBe("")
    expect(renderToString(htmlNode("div", {}, true, "x", false))).toBe("<div>x</div>")
  })
})
