import { describe, expect, it } from "vitest"
import { eventStreamResponse, liveElementsResponse } from "../src/realtime.js"
import { patchSignalsResponse, sseHeaders, sseResponseWithInit } from "../src/response.js"

async function* values<T>(...items: ReadonlyArray<T>): AsyncIterable<T> {
  for (const item of items) {
    yield item
  }
}

describe("SSE response init helpers", () => {
  it("merges SSE defaults with custom headers", () => {
    const headers = sseHeaders({ "x-trace": "abc" })

    expect(headers.get("content-type")).toBe("text/event-stream")
    expect(headers.get("cache-control")).toBe("no-cache")
    expect(headers.get("connection")).toBe("keep-alive")
    expect(headers.get("x-trace")).toBe("abc")
  })

  it("supports status and custom headers for raw SSE responses", async () => {
    const response = sseResponseWithInit({ status: 202, headers: { "x-job": "queued" } }, "event: queued\n\n")

    expect(response.status).toBe(202)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(response.headers.get("x-job")).toBe("queued")
    expect(await response.text()).toBe("event: queued\n\n")
  })

  it("supports status and custom headers for Datastar patch signal SSE responses", async () => {
    const response = patchSignalsResponse({ count: 1 }, undefined, {
      status: 202,
      headers: { "x-stream": "signals" }
    })

    expect(response.status).toBe(202)
    expect(response.headers.get("x-stream")).toBe("signals")
    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":1}\n\n')
  })

  it("supports status and custom headers for async event stream responses", async () => {
    const response = eventStreamResponse(values("event: live\n\n"), {
      status: 202,
      headers: { "x-live": "yes" }
    })

    expect(response.status).toBe(202)
    expect(response.headers.get("x-live")).toBe("yes")
    expect(await response.text()).toBe("event: live\n\n")
  })

  it("supports response init for live element streams", async () => {
    const response = liveElementsResponse(values(1), (count) => `<output>${count}</output>`, undefined, {
      headers: { "x-live-elements": "yes" }
    })

    expect(response.headers.get("x-live-elements")).toBe("yes")
    expect(await response.text()).toBe("event: datastar-patch-elements\ndata: elements <output>1</output>\n\n")
  })
})
