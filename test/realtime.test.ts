import * as Effect from "effect/Effect"
import * as PubSub from "effect/PubSub"
import * as Stream from "effect/Stream"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import { h } from "../src/html.js"
import {
  eventStreamResponse,
  heartbeatStream,
  liveElementsPubSubResponse,
  liveElementsResponse,
  makeBroadcaster,
  makeRealtimePubSub,
  makeRealtimePubSubScoped,
  mapToElementPatches,
  publishRealtime,
  shutdownRealtime,
  streamFromPubSub,
  sseComment,
  withHeartbeat
} from "../src/realtime.js"

const toWeb = (response: HttpServerResponse.HttpServerResponse): Response => HttpServerResponse.toWeb(response)

describe("realtime SSE helpers", () => {
  it("broadcasts published values through Effect PubSub subscriptions", async () => {
    const values = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function*() {
          const pubsub = yield* makeRealtimePubSub<number>({ capacity: 8, strategy: "bounded" })
          const first = yield* PubSub.subscribe(pubsub)
          const second = yield* PubSub.subscribe(pubsub)

          yield* publishRealtime(pubsub, 1)

          return yield* Effect.all([PubSub.take(first), PubSub.take(second)])
        })
      )
    )

    expect(values).toEqual([1, 1])
  })

  it("supports replay for late live subscribers", async () => {
    const pubsub = Effect.runSync(makeRealtimePubSub<number>({ capacity: 2, replay: 1, strategy: "sliding" }))

    await Effect.runPromise(publishRealtime(pubsub, 1))
    await Effect.runPromise(publishRealtime(pubsub, 2))

    const values = await Effect.runPromise(streamFromPubSub(pubsub).pipe(Stream.take(1), Stream.runCollect))

    expect(values).toEqual([2])
  })

  it("keeps the old makeBroadcaster alias backed by Effect PubSub", () => {
    expect(Effect.runSync(makeBroadcaster<number>())).toBeDefined()
  })

  it("shuts down scoped realtime PubSubs when the scope closes", async () => {
    const pubsub = await Effect.runPromise(Effect.scoped(makeRealtimePubSubScoped<number>()))

    await expect(Effect.runPromise(PubSub.isShutdown(pubsub))).resolves.toBe(true)
  })

  it("maps Effect Stream values to Datastar element patches", async () => {
    const patches = await Effect.runPromise(
      mapToElementPatches(Stream.make(1, 2), (n) => `<div id="n">${n}</div>`).pipe(Stream.runCollect)
    )

    expect(patches.join("")).toBe(
      'event: datastar-patch-elements\ndata: elements <div id="n">1</div>\n\nevent: datastar-patch-elements\ndata: elements <div id="n">2</div>\n\n'
    )
  })

  it("streams text/event-stream responses from Effect Streams", async () => {
    const response = toWeb(eventStreamResponse(Stream.make("event: one\n\n", "event: two\n\n")))

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe("event: one\n\nevent: two\n\n")
  })

  it("builds SSE comment heartbeats with Effect Stream ticks", async () => {
    const beats = await Effect.runPromise(heartbeatStream({ interval: 0, comment: "ping" }).pipe(Stream.take(2), Stream.runCollect))

    expect(beats).toEqual([": ping\n\n", ": ping\n\n"])
  })

  it("can merge heartbeat comments into an Effect event stream", async () => {
    const events = withHeartbeat(Stream.make("event: update\n\n"), { interval: 0, comment: "keepalive" })
    const response = toWeb(eventStreamResponse(events))

    expect(sseComment("hello\nworld")).toBe(": hello\n: world\n\n")
    expect(await response.text()).toContain("event: update\n\n")
  })

  it("can attach heartbeat comments at the response helper level", async () => {
    const response = toWeb(eventStreamResponse(Stream.fromEffect(Effect.never), { heartbeat: { interval: 0, comment: "ping" } }))
    const reader = response.body?.getReader()

    expect(reader).toBeDefined()

    const first = await reader!.read()
    expect(first.done).toBe(false)
    expect(new TextDecoder().decode(first.value)).toBe(": ping\n\n")

    await reader!.cancel()
  })

  it("can delay the first heartbeat so finite event streams do not get leading comments", async () => {
    const response = toWeb(
      eventStreamResponse(Stream.make("event: update\n\n"), {
        heartbeat: { interval: 0, initialDelay: "1 second", comment: "late" }
      })
    )

    expect(await response.text()).toBe("event: update\n\n")
  })

  it("still accepts async iterables at the response boundary", async () => {
    async function* values(): AsyncIterable<string> {
      yield "event: one\n\n"
      yield "event: two\n\n"
    }

    const response = toWeb(eventStreamResponse(values()))

    expect(await response.text()).toBe("event: one\n\nevent: two\n\n")
  })

  it("renders HTML nodes for live element responses", async () => {
    const response = toWeb(liveElementsResponse(Stream.make("Ada"), (name) => h("div", { id: "person" }, name)))

    expect(await response.text()).toBe('event: datastar-patch-elements\ndata: elements <div id="person">Ada</div>\n\n')
  })

  it("can bridge an Effect PubSub into an SSE response", async () => {
    const pubsub = Effect.runSync(makeRealtimePubSub<number>({ replay: 1 }))
    const response = toWeb(liveElementsPubSubResponse(pubsub, (n) => `<div id="count">${n}</div>`))
    const body = response.text()

    await Promise.resolve()
    await Effect.runPromise(publishRealtime(pubsub, 3))
    await Effect.runPromise(shutdownRealtime(pubsub))

    await expect(body).resolves.toBe('event: datastar-patch-elements\ndata: elements <div id="count">3</div>\n\n')
  })

  it("completes pubsub-backed response streams when the PubSub shuts down", async () => {
    const pubsub = Effect.runSync(makeRealtimePubSub<string>({ replay: 1 }))
    const response = toWeb(eventStreamResponse(streamFromPubSub(pubsub)))
    const body = response.text()

    await Promise.resolve()
    await Effect.runPromise(publishRealtime(pubsub, "event: done\n\n"))
    await Effect.runPromise(shutdownRealtime(pubsub))

    await expect(body).resolves.toBe("event: done\n\n")
  })
})
