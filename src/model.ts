import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import type * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { render, type Child } from "./html.js"
import * as reply from "./reply.js"
import { eventStreamResponse, type HeartbeatOptions } from "./realtime.js"
import { patchElements, type PatchElementsOptions } from "./sse.js"

export type View<State> = (state: State) => string | Exclude<Child, string>

export interface LiveQueryCoalesceOptions {
  readonly capacity?: number
  readonly strategy?: "dropping" | "sliding" | "suspend"
}

export interface LiveQueryOptions<State, InvalidationError = never, InvalidationContext = never, StateError = never, StateContext = never> {
  readonly invalidations: Stream.Stream<unknown, InvalidationError, InvalidationContext>
  readonly load: Effect.Effect<State, StateError, StateContext>
  readonly render: View<State>
  readonly patch?: PatchElementsOptions
  readonly renderOnConnect?: boolean
  readonly coalesce?: boolean | LiveQueryCoalesceOptions
}

export interface LiveQueryResponseOptions extends reply.BodyOptions {
  readonly heartbeat?: HeartbeatOptions
}

const renderView = <State>(state: State, view: View<State>): string => {
  const rendered = view(state)
  return typeof rendered === "string" ? rendered : render(rendered)
}

export const commandDone = (options?: reply.DoneOptions): HttpServerResponse.HttpServerResponse =>
  reply.done(options)

export const currentViewPatchResponse = <State>(
  state: State,
  view: View<State>,
  options?: PatchElementsOptions,
  responseOptions?: reply.BodyOptions
): HttpServerResponse.HttpServerResponse =>
  reply.patch(renderView(state, view), options, responseOptions)

const coalescedInvalidations = <E, R>(
  invalidations: Stream.Stream<unknown, E, R>,
  coalesce: boolean | LiveQueryCoalesceOptions | undefined
): Stream.Stream<void, E, R> => {
  const triggers = invalidations.pipe(Stream.map(() => undefined))

  if (coalesce === undefined || coalesce === false) {
    return triggers
  }

  const options = coalesce === true ? {} : coalesce
  return triggers.pipe(
    Stream.buffer({
      capacity: options.capacity ?? 1,
      strategy: options.strategy ?? "sliding"
    })
  )
}

export const liveQuery = <State, InvalidationError = never, InvalidationContext = never, StateError = never, StateContext = never>(
  options: LiveQueryOptions<State, InvalidationError, InvalidationContext, StateError, StateContext>
): Stream.Stream<string, InvalidationError | StateError, InvalidationContext | StateContext> => {
  const invalidations = coalescedInvalidations(options.invalidations, options.coalesce)
  const triggers = options.renderOnConnect === false
    ? invalidations
    : Stream.make(undefined as void).pipe(Stream.concat(invalidations))

  return triggers.pipe(
    Stream.mapEffect(() => options.load),
    Stream.map((state) => patchElements(renderView(state, options.render), options.patch))
  )
}

const withoutLiveQueryHeartbeat = (options: LiveQueryResponseOptions): reply.BodyOptions => {
  const { heartbeat: _heartbeat, ...responseOptions } = options
  return responseOptions
}

export const liveQueryResponse = <State, InvalidationError = never, StateError = never>(
  options: LiveQueryOptions<State, InvalidationError, never, StateError, never>,
  responseOptions: LiveQueryResponseOptions = {}
): HttpServerResponse.HttpServerResponse => {
  if (responseOptions.heartbeat === undefined) {
    return reply.stream(liveQuery(options), responseOptions)
  }

  return eventStreamResponse(liveQuery(options), {
    ...withoutLiveQueryHeartbeat(responseOptions),
    status: responseOptions.status ?? 200,
    heartbeat: responseOptions.heartbeat
  })
}

export const LiveQuery = {
  make: liveQuery,
  response: liveQueryResponse
} as const
