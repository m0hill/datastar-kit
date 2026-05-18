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

  it("supports status and custom headers for direct HTML patch responses", async () => {
    const response = htmlPatchResponse("<p>Accepted</p>", {
      selector: "#slot",
      init: {
        status: 202,
        headers: {
          "x-patch": "yes"
        }
      }
    })

    expect(response.status).toBe(202)
    expect(response.headers.get("x-patch")).toBe("yes")
    expect(response.headers.get("datastar-selector")).toBe("#slot")
    expect(await response.text()).toBe("<p>Accepted</p>")
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

  it("supports status and custom headers for JSON signal responses", async () => {
    const response = jsonSignalsResponse({ saved: true }, {
      init: {
        status: 202,
        headers: {
          "x-signals": "queued"
        }
      }
    })

    expect(response.status).toBe(202)
    expect(response.headers.get("x-signals")).toBe("queued")
    expect(await response.text()).toBe('{"saved":true}')
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

  it("supports status and custom headers for script responses", async () => {
    const response = scriptResponse("console.log('queued')", {
      init: {
        status: 202,
        headers: {
          "x-script": "queued"
        }
      }
    })

    expect(response.status).toBe(202)
    expect(response.headers.get("x-script")).toBe("queued")
    expect(await response.text()).toBe("console.log('queued')")
  })
})
