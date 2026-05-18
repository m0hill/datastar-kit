import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import { h } from "../src/html.js"
import { commandDone, currentViewPatchResponse, LiveQuery, liveQuery, liveQueryResponse } from "../src/model.js"

const countView = (count: number) => h("output", { id: "count" }, count)

describe("CQRS programming model helpers", () => {
  it("treats completed commands as 204 responses by default", () => {
    expect(commandDone().status).toBe(204)
  })

  it("renders current backend state as a Datastar element patch", async () => {
    const response = HttpServerResponse.toWeb(currentViewPatchResponse(3, countView, { selector: "#count", mode: "outer" }))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">3</output>\n\n'
    )
  })

  it("live queries render current state on connect and after invalidation", async () => {
    const states = [2, 5, 5]
    const patches = await Effect.runPromise(
      liveQuery({
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

  it("can disable render-on-connect for explicit invalidation-only streams", async () => {
    let count = 0
    const patches = await Effect.runPromise(
      LiveQuery.make({
        invalidations: Stream.make("refresh"),
        load: Effect.sync(() => ++count),
        render: countView,
        renderOnConnect: false
      }).pipe(Stream.runCollect)
    )

    expect(patches).toEqual([
      'event: datastar-patch-elements\ndata: elements <output id="count">1</output>\n\n'
    ])
  })

  it("supports heartbeat comments at the live query response boundary", async () => {
    const response = HttpServerResponse.toWeb(
      liveQueryResponse(
        {
          invalidations: Stream.fromEffect(Effect.never),
          load: Effect.succeed(0),
          render: countView
        },
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
})
