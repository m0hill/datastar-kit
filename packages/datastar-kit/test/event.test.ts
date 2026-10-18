import { describe, expect, it } from "vitest"
import * as event from "../src/event.js"

if (false) {
  // @ts-expect-error Blessed event helpers require a signal-state object.
  event.signals('{"title":""}')
  // @ts-expect-error Datastar rejects remove patches without a selector.
  event.remove()
}

describe("Datastar SSE event helpers", () => {
  it("builds safe navigation events", () => {
    expect(event.navigate("/issues/1", { baseUrl: "https://app.example", id: "nav" })).toBe(
      'event: datastar-patch-elements\nid: nav\ndata: mode append\ndata: selector body\ndata: elements <script data-effect="el.remove()">setTimeout(() => { window.location.href = "/issues/1" })</script>\n\n'
    )

    expect(() => event.navigate("javascript:alert(1)", { baseUrl: "https://app.example" })).toThrow(
      event.NavigationUrlError
    )
  })

  it("builds element removal events", () => {
    expect(event.remove("#toast-saved", { id: "rm", useViewTransition: true })).toBe(
      "event: datastar-patch-elements\nid: rm\ndata: selector #toast-saved\ndata: mode remove\ndata: useViewTransition true\n\n"
    )
  })
})
