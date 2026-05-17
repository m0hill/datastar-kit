import { describe, expect, it } from "vitest"
import { htmlPatchResponse, jsonSignalsResponse, scriptResponse } from "../src/response.js"

describe("direct Datastar response helpers", () => {
  it("builds text/html patch responses with Datastar override headers", async () => {
    const response = htmlPatchResponse("<p>Updated</p>", {
      selector: "#slot",
      mode: "inner",
      useViewTransition: true
    })

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(response.headers.get("datastar-selector")).toBe("#slot")
    expect(response.headers.get("datastar-mode")).toBe("inner")
    expect(response.headers.get("datastar-use-view-transition")).toBe("true")
    expect(await response.text()).toBe("<p>Updated</p>")
  })

  it("builds application/json signal responses", async () => {
    const response = jsonSignalsResponse({ count: 1 }, { onlyIfMissing: true })

    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8")
    expect(response.headers.get("datastar-only-if-missing")).toBe("true")
    expect(await response.text()).toBe('{"count":1}')
  })

  it("passes pre-serialized JSON signal response bodies through", async () => {
    const response = jsonSignalsResponse('{"count":2}')

    expect(await response.text()).toBe('{"count":2}')
  })

  it("builds text/javascript responses with script attributes", async () => {
    const response = scriptResponse("console.log('hello')", {
      attributes: {
        type: "module",
        async: true
      }
    })

    expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8")
    expect(response.headers.get("datastar-script-attributes")).toBe('{"type":"module","async":true}')
    expect(await response.text()).toBe("console.log('hello')")
  })
})
