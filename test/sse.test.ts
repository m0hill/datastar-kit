import { describe, expect, it } from "vitest"
import { eventStream, patchElements, patchSignals, removeElements } from "../src/sse.js"

describe("Datastar SSE encoding", () => {
  it("encodes default element patches like the SDK fixture", () => {
    expect(patchElements("<div>Merge</div>")).toBe("event: datastar-patch-elements\ndata: elements <div>Merge</div>\n\n")
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

  it("splits multiline element payloads into repeated data lines", () => {
    expect(patchElements("<div>\n  Hello\n</div>")).toBe(
      "event: datastar-patch-elements\ndata: elements <div>\ndata: elements   Hello\ndata: elements </div>\n\n"
    )
  })

  it("encodes remove element events", () => {
    expect(removeElements("#target")).toBe(
      "event: datastar-patch-elements\ndata: mode remove\ndata: selector #target\n\n"
    )
  })

  it("encodes signal patches from objects", () => {
    expect(patchSignals({ one: 1, two: 2 })).toBe(
      'event: datastar-patch-signals\ndata: signals {"one":1,"two":2}\n\n'
    )
  })

  it("encodes signal patch options like the SDK fixture", () => {
    expect(
      patchSignals({ one: 1, two: 2 }, {
        id: "event1",
        retry: 2000,
        onlyIfMissing: true
      })
    ).toBe(
      'event: datastar-patch-signals\nid: event1\nretry: 2000\ndata: onlyIfMissing true\ndata: signals {"one":1,"two":2}\n\n'
    )
  })

  it("concatenates multiple events into one stream", () => {
    expect(eventStream(patchElements("<div>One</div>"), patchElements("<div>Two</div>"))).toBe(
      "event: datastar-patch-elements\ndata: elements <div>One</div>\n\nevent: datastar-patch-elements\ndata: elements <div>Two</div>\n\n"
    )
  })
})
