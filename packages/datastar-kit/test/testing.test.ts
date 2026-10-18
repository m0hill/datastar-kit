import { describe, expect, it } from "vitest"
import * as event from "../src/event.js"
import { h } from "../src/html.js"
import * as reply from "../src/reply.js"
import { DatastarEventError, readEvents } from "../src/testing.js"

describe("readEvents", () => {
  it("decodes an element patch with Datastar defaults filled in", async () => {
    const events = await readEvents(reply.patch(h("output", { id: "count" }, "1")))

    expect(events).toEqual([
      {
        type: "patch-elements",
        selector: undefined,
        mode: "outer",
        namespace: "html",
        useViewTransition: false,
        viewTransitionSelector: undefined,
        elements: '<output id="count">1</output>',
        id: undefined,
        retry: 1000
      }
    ])
  })

  it("decodes every event in a stream, joining multi-line values", async () => {
    const response = reply.stream([
      event.patch(h("pre", {}, "line one\nline two"), { selector: "#log", mode: "inner" }),
      event.signals({ note: "first\nsecond", saved: true }, { onlyIfMissing: true })
    ])

    expect(await readEvents(response)).toEqual([
      expect.objectContaining({
        type: "patch-elements",
        selector: "#log",
        mode: "inner",
        elements: "<pre>line one\nline two</pre>"
      }),
      {
        type: "patch-signals",
        signals: { note: "first\nsecond", saved: true },
        onlyIfMissing: true,
        id: undefined,
        retry: 1000
      }
    ])
  })

  it("skips comments and keeps event ids and retry delays", async () => {
    const response = reply.stream([
      event.comment("heartbeat"),
      event.signals({ count: 2 }, { id: "evt-7", retry: 2500 }),
      event.comment()
    ])

    expect(await readEvents(response)).toEqual([
      {
        type: "patch-signals",
        signals: { count: 2 },
        onlyIfMissing: false,
        id: "evt-7",
        retry: 2500
      }
    ])
  })

  it("stops an endless stream after count events and cancels it", async () => {
    let stopped = false
    const response = reply.stream(
      (async function* () {
        try {
          for (let tick = 0; ; tick += 1) yield event.signals({ tick })
        } finally {
          stopped = true
        }
      })()
    )

    const events = await readEvents(response, { count: 2 })

    expect(events.map((decoded) => decoded.type === "patch-signals" && decoded.signals)).toEqual([
      { tick: 0 },
      { tick: 1 }
    ])
    await expect.poll(() => stopped).toBe(true)
  }, 1000)

  it("returns no events for a no-content reply", async () => {
    expect(await readEvents(reply.done())).toEqual([])
  })

  it("rejects responses that are not Datastar SSE", async () => {
    await expect(readEvents(reply.page(h("main", {})))).rejects.toThrow(DatastarEventError)
    await expect(readEvents(reply.stream(["event: message\ndata: hi\n\n"]))).rejects.toThrow(
      'Unexpected SSE event: "message"'
    )
    await expect(
      readEvents(reply.stream(["event: datastar-patch-elements\ndata: mode sideways\n\n"]))
    ).rejects.toThrow('Unexpected patch-elements mode: "sideways"')
  })
})
