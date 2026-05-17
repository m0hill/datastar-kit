import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { h } from "../src/html.js"
import { Broadcaster, eventStreamResponse, liveElementsResponse, makeBroadcaster, mapToElementPatches } from "../src/realtime.js"

async function* values<T>(...items: ReadonlyArray<T>): AsyncIterable<T> {
  for (const item of items) {
    yield item
  }
}

describe("realtime SSE helpers", () => {
  it("broadcasts published values to subscribers", async () => {
    const broadcaster = Effect.runSync(makeBroadcaster<number>())
    const subscription = Effect.runSync(broadcaster.subscribe())

    Effect.runSync(broadcaster.publish(1))

    await expect(subscription.next()).resolves.toEqual({ done: false, value: 1 })
    subscription.close()
    await expect(Effect.runPromise(broadcaster.size())).resolves.toBe(0)
  })

  it("maps async values to Datastar element patches", async () => {
    const patches: Array<string> = []

    for await (const patch of mapToElementPatches(values(1, 2), (n) => `<div id="n">${n}</div>`)) {
      patches.push(patch)
    }

    expect(patches.join("")).toBe(
      'event: datastar-patch-elements\ndata: elements <div id="n">1</div>\n\nevent: datastar-patch-elements\ndata: elements <div id="n">2</div>\n\n'
    )
  })

  it("streams text/event-stream responses from async events", async () => {
    const response = eventStreamResponse(values("event: one\n\n", "event: two\n\n"))

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe("event: one\n\nevent: two\n\n")
  })

  it("renders HTML nodes for live element responses", async () => {
    const response = liveElementsResponse(values("Ada"), (name) => h("div", { id: "person" }, name))

    expect(await response.text()).toBe('event: datastar-patch-elements\ndata: elements <div id="person">Ada</div>\n\n')
  })

  it("can bridge a broadcaster subscription into an SSE response", async () => {
    const broadcaster = new Broadcaster<number>()
    const subscription = Effect.runSync(broadcaster.subscribe())
    const response = liveElementsResponse(subscription, (n) => `<div id="count">${n}</div>`)
    const body = response.text()

    Effect.runSync(broadcaster.publish(3))
    subscription.close()

    await expect(body).resolves.toBe('event: datastar-patch-elements\ndata: elements <div id="count">3</div>\n\n')
  })

  it("closes broadcaster subscriptions when SSE response bodies are canceled", async () => {
    const broadcaster = new Broadcaster<string>()
    const subscription = Effect.runSync(broadcaster.subscribe())
    const response = eventStreamResponse(subscription)
    const reader = response.body?.getReader()

    expect(reader).toBeDefined()
    expect(Effect.runSync(broadcaster.size())).toBe(1)

    await reader!.cancel()

    expect(Effect.runSync(broadcaster.size())).toBe(0)
  })
})
