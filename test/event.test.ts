import { describe, expect, it } from "vitest"
import * as event from "../src/event.js"
import { h, unsafeHtml } from "../src/html.js"

describe("Datastar SSE event helpers", () => {
  it("renders HTML nodes into patch events", () => {
    expect(event.patchElements(h("output", { id: "count" }, 2), { selector: "#count" })).toBe(
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">2</output>\n\n'
    )
  })

  it("keeps unsafe HTML explicit at the HTML boundary", () => {
    expect(event.patchElements(unsafeHtml("<strong>Saved</strong>"))).toBe(
      "event: datastar-patch-elements\ndata: elements <strong>Saved</strong>\n\n"
    )
  })

  it("builds signal and script events", () => {
    expect(event.patchSignals({ title: "" })).toBe(
      'event: datastar-patch-signals\ndata: signals {"title":""}\n\n'
    )
    expect(event.executeScript("console.log('hello')")).toContain("data: elements <script")
  })
})
