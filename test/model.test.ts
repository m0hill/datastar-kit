import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import { h } from "../src/html.js"
import { commandDone, currentViewPatchResponse, liveQuery } from "../src/model.js"

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
})
