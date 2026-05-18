import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as PubSub from "effect/PubSub"
import * as Stream from "effect/Stream"
import type * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import type { Child } from "./html.js"
import { render } from "./html.js"
import { platformEventStreamResponse, type PlatformEventSource, type PlatformResponseOptions } from "./platform.js"
import { patchElements, type PatchElementsOptions } from "./sse.js"

export type RealtimePubSub<A> = PubSub.PubSub<A>
export type RealtimeStream<A, E = never> = Stream.Stream<A, E>

export type RealtimePubSubStrategy = "bounded" | "dropping" | "sliding" | "unbounded"

export interface RealtimePubSubOptions {
  readonly capacity?: number
  readonly strategy?: RealtimePubSubStrategy
  readonly replay?: number
}

const DEFAULT_CAPACITY = 64
const DEFAULT_STRATEGY: RealtimePubSubStrategy = "sliding"

const withReplay = (
  capacity: number,
  replay: number | undefined
): number | { readonly capacity: number; readonly replay: number } =>
  replay === undefined ? capacity : { capacity, replay }

export const makeRealtimePubSub = <A>(options: RealtimePubSubOptions = {}): Effect.Effect<RealtimePubSub<A>> => {
  const strategy = options.strategy ?? DEFAULT_STRATEGY
  const capacity = options.capacity ?? DEFAULT_CAPACITY

  switch (strategy) {
    case "bounded":
      return PubSub.bounded<A>(withReplay(capacity, options.replay))
    case "dropping":
      return PubSub.dropping<A>(withReplay(capacity, options.replay))
    case "sliding":
      return PubSub.sliding<A>(withReplay(capacity, options.replay))
    case "unbounded":
      return options.replay === undefined ? PubSub.unbounded<A>() : PubSub.unbounded<A>({ replay: options.replay })
  }
}

export const makeRealtimePubSubScoped = <A>(options: RealtimePubSubOptions = {}) =>
  Effect.gen(function*() {
    const pubsub = yield* makeRealtimePubSub<A>(options)
    yield* Effect.addFinalizer(() => shutdownRealtime(pubsub))
    return pubsub
  })

export const makeBroadcaster = makeRealtimePubSub

export const publishRealtime = <A>(pubsub: RealtimePubSub<A>, value: A): Effect.Effect<boolean> =>
  PubSub.publish(pubsub, value)

export const shutdownRealtime = <A>(pubsub: RealtimePubSub<A>): Effect.Effect<void> =>
  PubSub.shutdown(pubsub)

export const streamFromPubSub = <A>(pubsub: RealtimePubSub<A>): Stream.Stream<A> =>
  Stream.fromPubSub(pubsub)

export interface HeartbeatOptions {
  readonly interval?: Duration.Input
  readonly comment?: string
}

export const sseComment = (comment = ""): string =>
  comment.length === 0 ? ":\n\n" : `: ${comment.replaceAll("\n", "\n: ")}\n\n`

export const heartbeatStream = (options: HeartbeatOptions = {}): Stream.Stream<string> =>
  Stream.tick(options.interval ?? "15 seconds").pipe(
    Stream.map(() => sseComment(options.comment ?? "heartbeat"))
  )

export const withHeartbeat = <E = never, R = never>(
  events: Stream.Stream<string, E, R>,
  options?: HeartbeatOptions
): Stream.Stream<string, E, R> =>
  events.pipe(Stream.merge(heartbeatStream(options), { haltStrategy: "left" }))

export interface RealtimeResponseOptions extends PlatformResponseOptions {
  readonly heartbeat?: HeartbeatOptions
}

const isRealtimeStream = (source: PlatformEventSource): source is Stream.Stream<string, unknown> =>
  "channel" in source

const toRealtimeStream = (source: PlatformEventSource): Stream.Stream<string, unknown> =>
  isRealtimeStream(source) ? source : Stream.fromAsyncIterable(source, (cause) => cause)

const withoutHeartbeat = (options: RealtimeResponseOptions): PlatformResponseOptions => {
  const { heartbeat: _heartbeat, ...responseOptions } = options
  return responseOptions
}

export const mapToElementPatches = <A, E = never>(
  source: Stream.Stream<A, E>,
  renderValue: (value: A) => string | Child,
  options?: PatchElementsOptions
): Stream.Stream<string, E> =>
  source.pipe(
    Stream.map((value) => {
      const html = renderValue(value)
      return patchElements(typeof html === "string" ? html : render(html), options)
    })
  )

export const eventStreamResponse = (
  events: PlatformEventSource,
  options?: RealtimeResponseOptions
): HttpServerResponse.HttpServerResponse => {
  if (options?.heartbeat === undefined) {
    return platformEventStreamResponse(events, options)
  }

  return platformEventStreamResponse(withHeartbeat(toRealtimeStream(events), options.heartbeat), withoutHeartbeat(options))
}

export const liveElementsResponse = <A, E = never>(
  source: Stream.Stream<A, E>,
  renderValue: (value: A) => string | Child,
  options?: PatchElementsOptions,
  responseOptions?: RealtimeResponseOptions
): HttpServerResponse.HttpServerResponse =>
  eventStreamResponse(mapToElementPatches(source, renderValue, options), responseOptions)

export const liveElementsPubSubResponse = <A>(
  pubsub: RealtimePubSub<A>,
  renderValue: (value: A) => string | Child,
  options?: PatchElementsOptions,
  responseOptions?: RealtimeResponseOptions
): HttpServerResponse.HttpServerResponse =>
  liveElementsResponse(streamFromPubSub(pubsub), renderValue, options, responseOptions)
