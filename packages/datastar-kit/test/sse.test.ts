import { describe, expect, it } from "vitest"
import { HtmlNameError } from "../src/html.js"
import { executeScript, patchElements, patchSignals } from "../src/sse.js"

describe("Datastar SSE encoding", () => {
  it("encodes default element patches like the SDK fixture", () => {
    expect(patchElements("<div>Merge</div>")).toBe(
      "event: datastar-patch-elements\ndata: elements <div>Merge</div>\n\n"
    )
  })

  it("encodes element patch options in Datastar SDK order", () => {
    expect(
      patchElements("<div>Merge</div>", {
        id: "event1",
        retry: 2000,
        selector: "div",
        mode: "append",
        useViewTransition: true
      })
    ).toBe(
      "event: datastar-patch-elements\nid: event1\nretry: 2000\ndata: selector div\ndata: mode append\ndata: useViewTransition true\ndata: elements <div>Merge</div>\n\n"
    )
  })

  it("encodes scoped view transition selectors for Datastar v1.0.2", () => {
    expect(
      patchElements("<div>Merge</div>", {
        selector: "#target",
        useViewTransition: true,
        viewTransitionSelector: "#transition-scope"
      })
    ).toBe(
      "event: datastar-patch-elements\ndata: selector #target\ndata: useViewTransition true\ndata: viewTransitionSelector #transition-scope\ndata: elements <div>Merge</div>\n\n"
    )
  })

  it("encodes non-default element patch namespaces", () => {
    expect(
      patchElements("<circle></circle>", { selector: "#icon", mode: "inner", namespace: "svg" })
    ).toBe(
      "event: datastar-patch-elements\ndata: selector #icon\ndata: mode inner\ndata: namespace svg\ndata: elements <circle></circle>\n\n"
    )
  })

  it("splits multiline element payloads into repeated data lines", () => {
    expect(patchElements("<div>\n  Hello\n</div>")).toBe(
      "event: datastar-patch-elements\ndata: elements <div>\ndata: elements   Hello\ndata: elements </div>\n\n"
    )
  })

  it("encodes element removal through patch options", () => {
    expect(patchElements("", { selector: "#target", mode: "remove" })).toBe(
      "event: datastar-patch-elements\ndata: selector #target\ndata: mode remove\n\n"
    )
  })

  it("encodes signal patches from objects", () => {
    expect(patchSignals({ one: 1, two: 2 })).toBe(
      'event: datastar-patch-signals\ndata: signals {"one":1,"two":2}\n\n'
    )
  })

  it("encodes signal patch options like the SDK fixture", () => {
    expect(
      patchSignals(
        { one: 1, two: 2 },
        {
          id: "event1",
          retry: 2000,
          onlyIfMissing: true
        }
      )
    ).toBe(
      'event: datastar-patch-signals\nid: event1\nretry: 2000\ndata: onlyIfMissing true\ndata: signals {"one":1,"two":2}\n\n'
    )
  })

  it("returns complete event strings that can be concatenated into a stream", () => {
    expect([patchElements("<div>One</div>"), patchElements("<div>Two</div>")].join("")).toBe(
      "event: datastar-patch-elements\ndata: elements <div>One</div>\n\nevent: datastar-patch-elements\ndata: elements <div>Two</div>\n\n"
    )
  })

  it("encodes script attributes and auto-removal explicitly", () => {
    expect(
      executeScript("console.log('<')", {
        attributes: { type: "module", "data-note": "A&B\"'" },
        autoRemove: false
      })
    ).toBe(
      'event: datastar-patch-elements\ndata: mode append\ndata: selector body\ndata: elements <script type="module" data-note="A&amp;B&quot;&#39;">console.log(\'<\')</script>\n\n'
    )
  })

  it("validates script event attribute names like the HTML renderer", () => {
    expect(() =>
      executeScript("console.log('hello')", {
        attributes: { 'type" onclick="alert(1)': "module" }
      })
    ).toThrow(HtmlNameError)
  })
})
