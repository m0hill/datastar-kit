import { describe, expect, it } from "vitest"
import { HtmlNameError } from "../src/html.js"
import { comment, executeScript, patchElements, patchSignals, SseFieldError } from "../src/sse.js"

describe("Datastar SSE encoding", () => {
  it("encodes SSE comments for manual heartbeats", () => {
    expect(comment()).toBe(":\n\n")
    expect(comment("heartbeat")).toBe(": heartbeat\n\n")
    expect(comment("one\r\ntwo\rthree\nfour")).toBe(": one\n: two\n: three\n: four\n\n")
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

  it("encodes scoped view transition selectors only when view transitions are enabled", () => {
    expect(
      patchElements("<div>Merge</div>", {
        selector: "#target",
        useViewTransition: true,
        viewTransitionSelector: "#transition-scope"
      })
    ).toBe(
      "event: datastar-patch-elements\ndata: selector #target\ndata: useViewTransition true\ndata: viewTransitionSelector #transition-scope\ndata: elements <div>Merge</div>\n\n"
    )
    expect(
      patchElements("<div>Merge</div>", {
        selector: "#target",
        viewTransitionSelector: "#transition-scope"
      })
    ).toBe(
      "event: datastar-patch-elements\ndata: selector #target\ndata: elements <div>Merge</div>\n\n"
    )
  })

  it("encodes non-default element patch namespaces", () => {
    expect(
      patchElements("<circle></circle>", { selector: "#icon", mode: "inner", namespace: "svg" })
    ).toBe(
      "event: datastar-patch-elements\ndata: selector #icon\ndata: mode inner\ndata: namespace svg\ndata: elements <circle></circle>\n\n"
    )
  })

  it("keeps carriage returns in payloads from starting new SSE fields", () => {
    expect(patchElements("<div>\r  Hello\r</div>")).toBe(
      "event: datastar-patch-elements\ndata: elements <div>\ndata: elements   Hello\ndata: elements </div>\n\n"
    )
    expect(patchSignals('{"safe":true}\rid: injected')).toBe(
      'event: datastar-patch-signals\ndata: signals {"safe":true}\ndata: signals id: injected\n\n'
    )
  })

  it("rejects line breaks in single-line SSE fields", () => {
    expect(() => patchElements("<div/>", { id: "a\nb" })).toThrow(SseFieldError)
    expect(() => patchSignals({ a: 1 }, { id: "bad\rid" })).toThrow(SseFieldError)
    expect(() => patchElements("<div/>", { selector: "#x\ndata: elements <script>" })).toThrow(
      SseFieldError
    )
    expect(() =>
      patchElements("<div/>", { useViewTransition: true, viewTransitionSelector: "#x\r\n" })
    ).toThrow(SseFieldError)
  })

  it("renders script attributes with HTML boolean semantics before auto-removal", () => {
    expect(
      executeScript("boot()", {
        attributes: { async: true, defer: false, "data-enabled": false }
      })
    ).toBe(
      'event: datastar-patch-elements\ndata: mode append\ndata: selector body\ndata: elements <script async data-enabled="false" data-effect="el.remove()">boot()</script>\n\n'
    )
  })

  it("escapes </script> and <!-- sequences in the script body", () => {
    const out = executeScript("x = '</script>' + '</SCRIPT>' + '<!-- hi'")

    expect(out).toContain("x = '<\\/script>' + '<\\/SCRIPT>' + '<\\!-- hi'")
    expect(out.split(/<\/script>/i)).toHaveLength(2)
  })

  it("rejects script attribute names that would break out of the tag", () => {
    expect(() =>
      executeScript("console.log('hello')", {
        attributes: { 'type" onclick="alert(1)': "module" }
      })
    ).toThrow(HtmlNameError)
  })
})
