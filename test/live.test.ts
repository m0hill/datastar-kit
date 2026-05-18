import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import { h } from "../src/html.js"
import { query } from "../src/live.js"
import { stream } from "../src/reply.js"

const countView = (count: number) => h("output", { id: "count" }, count)

describe("live.query", () => {
  it("renders current state on connect and after invalidation triggers", async () => {
    const states = [2, 5, 5]
    const patches = await Effect.runPromise(
      query({
        invalidations: Stream.make("missed-delta", "refresh"),
        load: Effect.sync(() => states.shift() ?? -1),
        render: countView,
        patch: { selector: "#count", mode: "outer" }
      }).pipe(Stream.runCollect)
    )

    expect(patches).toEqual([
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">2</output>\n\n',
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">5</output>\n\n',
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">5</output>\n\n'
    ])
  })

  it("treats invalidation values as triggers instead of passing deltas to render", async () => {
    let count = 0
    const patches = await Effect.runPromise(
      query({
        invalidations: Stream.make(10, 20),
        load: Effect.sync(() => ++count),
        render: countView
      }).pipe(Stream.runCollect)
    )

    expect(patches).toEqual([
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n',
      'event: datastar-patch-elements\ndata: elements <output id="count">2</output>\n\n',
      'event: datastar-patch-elements\ndata: elements <output id="count">3</output>\n\n'
    ])
  })

  it("composes with reply.stream for SSE responses and heartbeat comments", async () => {
    const response = HttpServerResponse.toWeb(
      stream(
        query({
          invalidations: Stream.fromEffect(Effect.never),
          load: Effect.succeed(0),
          render: countView
        }),
        { heartbeat: { interval: 0, initialDelay: "1 millis", comment: "live" } }
      )
    )
    const reader = response.body?.getReader()

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(reader).toBeDefined()

    const first = await reader!.read()
    expect(first.done).toBe(false)
    expect(new TextDecoder().decode(first.value)).toContain('<output id="count">0</output>')

    const second = await reader!.read()
    expect(second.done).toBe(false)
    expect(new TextDecoder().decode(second.value)).toBe(": live\n\n")

    await reader!.cancel()
  })

  it("lets load failures fail the stream for explicit app handling", async () => {
    await expect(
      Effect.runPromise(
        query({
          invalidations: Stream.empty,
          load: Effect.fail("boom"),
          render: countView
        }).pipe(Stream.runCollect)
      )
    ).rejects.toBe("boom")
  })
})
