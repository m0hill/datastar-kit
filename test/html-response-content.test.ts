import { describe, expect, it } from "vitest"
import { h } from "../src/html.js"
import { htmlPatchResponse, htmlResponse } from "../src/response.js"

describe("HTML response content rendering", () => {
  it("keeps string HTML response bodies raw", async () => {
    expect(await htmlResponse("<p>Raw</p>").text()).toBe("<p>Raw</p>")
  })

  it("renders HTML nodes for full HTML responses", async () => {
    const response = htmlResponse(h("p", {}, "Ada & Grace"))

    expect(await response.text()).toBe("<p>Ada &amp; Grace</p>")
  })

  it("renders HTML nodes for direct Datastar patch responses", async () => {
    const response = htmlPatchResponse(h("div", { id: "slot" }, "Updated"), { selector: "#slot" })

    expect(response.headers.get("datastar-selector")).toBe("#slot")
    expect(await response.text()).toBe('<div id="slot">Updated</div>')
  })
})
