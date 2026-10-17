import { describe, expect, it } from "vitest"
import * as event from "../src/event.js"
import { h } from "../src/html.js"

if (false) {
  // @ts-expect-error Blessed event helpers require a signal-state object.
  event.signals('{"title":""}')
}

describe("Datastar SSE event helpers", () => {
  it("renders HTML nodes into escaped patch events", () => {
    expect(event.patch(h("output", { id: "count" }, "<2>"), { selector: "#count" })).toBe(
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">&lt;2&gt;</output>\n\n'
    )
  })

  it("builds safe navigation events", () => {
    expect(event.navigate("/issues/1", { baseUrl: "https://app.example", id: "nav" })).toBe(
      'event: datastar-patch-elements\nid: nav\ndata: mode append\ndata: selector body\ndata: elements <script data-effect="el.remove()">setTimeout(() => { window.location.href = "/issues/1" })</script>\n\n'
    )

    expect(() => event.navigate("javascript:alert(1)", { baseUrl: "https://app.example" })).toThrow(
      event.NavigationUrlError
    )
  })
})
