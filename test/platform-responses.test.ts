import { describe, expect, it } from "vitest"
import { h, raw } from "../src/html.js"
import * as reply from "../src/reply.js"

describe("reply SSE responses", () => {
  it("serves Datastar SSE streams", async () => {
    const response = reply.stream(["event: ready\n\n"], { headers: { "x-sse": "yes" } })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(response.headers.get("cache-control")).toBe("no-cache")
    expect(response.headers.get("x-sse")).toBe("yes")
    expect(await response.text()).toBe("event: ready\n\n")
  })

  it("serves Datastar signal patch responses", async () => {
    const response = reply.signals({ count: 1 }, undefined, { headers: { "x-signals": "yes" } })

    expect(response.headers.get("x-signals")).toBe("yes")
    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":1}\n\n')
  })

  it("renders HTML nodes in element patches", async () => {
    const response = reply.patch(h("span", {}, "Ada & Grace"), { selector: "#name" })

    expect(await response.text()).toBe(
      "event: datastar-patch-elements\ndata: selector #name\ndata: elements <span>Ada &amp; Grace</span>\n\n"
    )
  })

  it("escapes string patches unless raw HTML is explicit", async () => {
    const text = reply.patch("<strong>Saved</strong>")
    const html = reply.patch(raw("<strong>Saved</strong>"))

    expect(await text.text()).toBe(
      "event: datastar-patch-elements\ndata: elements &lt;strong&gt;Saved&lt;/strong&gt;\n\n"
    )
    expect(await html.text()).toBe(
      "event: datastar-patch-elements\ndata: elements <strong>Saved</strong>\n\n"
    )
  })

  it("streams async iterable SSE responses", async () => {
    async function* events() {
      yield "event: first\n\n"
      yield "event: second\n\n"
    }

    const response = reply.stream(events())

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe("event: first\n\nevent: second\n\n")
  })

  it("streams Web Stream responses with headers", async () => {
    const source = new ReadableStream<string>({
      start(controller) {
        controller.enqueue("event: meta\n\n")
        controller.close()
      }
    })
    const response = reply.stream(source, { headers: { "x-stream": "web" } })

    expect(response.status).toBe(200)
    expect(response.headers.get("x-stream")).toBe("web")
    expect(response.headers.get("cache-control")).toBe("no-cache")
    expect(await response.text()).toBe("event: meta\n\n")
  })
})
