import { describe, expect, it } from "vitest"
import * as event from "../src/event.js"
import { HtmlNameError, unsafeHtml } from "../src/index.js"

describe("Datastar SSE encoding", () => {
  it("encodes SSE comments for manual heartbeats", () => {
    expect(event.comment()).toBe(":\n\n")
    expect(event.comment("heartbeat")).toBe(": heartbeat\n\n")
    expect(event.comment("one\r\ntwo\rthree\nfour")).toBe(": one\n: two\n: three\n: four\n\n")
  })

  // Datastar's SDK spec (sdk/ADR.md) requires leaving out `retry:` when it is the 1000ms default.
  it("omits the retry field when it is Datastar's default", () => {
    expect(event.signals({ count: 1 }, { retry: 1000 })).toBe(
      'event: datastar-patch-signals\ndata: signals {"count":1}\n\n'
    )
  })

  it("encodes scoped view transition selectors only when view transitions are enabled", () => {
    expect(
      event.patch(unsafeHtml("<div>Merge</div>"), {
        selector: "#target",
        useViewTransition: true,
        viewTransitionSelector: "#transition-scope"
      })
    ).toBe(
      "event: datastar-patch-elements\ndata: selector #target\ndata: useViewTransition true\ndata: viewTransitionSelector #transition-scope\ndata: elements <div>Merge</div>\n\n"
    )
    expect(
      event.patch(unsafeHtml("<div>Merge</div>"), {
        selector: "#target",
        viewTransitionSelector: "#transition-scope"
      })
    ).toBe(
      "event: datastar-patch-elements\ndata: selector #target\ndata: elements <div>Merge</div>\n\n"
    )
  })

  it("encodes non-default element patch namespaces", () => {
    expect(
      event.patch(unsafeHtml("<circle></circle>"), {
        selector: "#icon",
        mode: "inner",
        namespace: "svg"
      })
    ).toBe(
      "event: datastar-patch-elements\ndata: selector #icon\ndata: mode inner\ndata: namespace svg\ndata: elements <circle></circle>\n\n"
    )
  })

  it("keeps carriage returns in payloads from starting new SSE fields", () => {
    expect(event.patch(unsafeHtml("<div>\r  Hello\r</div>"))).toBe(
      "event: datastar-patch-elements\ndata: elements <div>\ndata: elements   Hello\ndata: elements </div>\n\n"
    )
  })

  it("rejects retry delays that are not whole milliseconds", () => {
    for (const retry of [Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY]) {
      expect(() => event.signals({ a: 1 }, { retry })).toThrow(event.SseFieldError)
    }
  })

  it("rejects line breaks in single-line SSE fields", () => {
    const invalidField = event.SseFieldError
    expect(() => event.patch("x", { id: "a\nb" })).toThrow(invalidField)
    expect(() => event.signals({ a: 1 }, { id: "bad\rid" })).toThrow(invalidField)
    expect(() => event.patch("x", { selector: "#x\ndata: elements <script>" })).toThrow(
      invalidField
    )
    expect(() =>
      event.patch("x", { useViewTransition: true, viewTransitionSelector: "#x\r\n" })
    ).toThrow(invalidField)
  })

  it("renders script attributes with HTML boolean semantics before auto-removal", () => {
    expect(
      event.script("boot()", {
        attributes: { async: true, defer: false, "data-enabled": false }
      })
    ).toBe(
      'event: datastar-patch-elements\ndata: mode append\ndata: selector body\ndata: elements <script async data-enabled="false" data-effect="el.remove()">boot()</script>\n\n'
    )
  })

  // The browser test proves the script still runs; this pins that nothing can close it early.
  it("keeps </script> and <!-- in the script body from ending the element", () => {
    const out = event.script("x = '</script>' + '</SCRIPT>' + '<!-- hi'")

    expect(out.split(/<\/script>/i)).toHaveLength(2)
    expect(out).not.toContain("<!--")
  })

  it("rejects script attribute names that would break out of the tag", () => {
    expect(() =>
      event.script("console.log('hello')", {
        attributes: { 'type" onclick="alert(1)': "module" }
      })
    ).toThrow(HtmlNameError)
  })
})
