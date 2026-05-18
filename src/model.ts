import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import type * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { render, type Child } from "./html.js"
import {
  datastarEventStreamResponse,
  datastarNoContentResponse,
  datastarPatchElementsResponse,
  type DatastarBodyResponseOptions,
  type DatastarNoContentResponseOptions
} from "./platform.js"
import { patchElements, type PatchElementsOptions } from "./sse.js"

export type View<State> = (state: State) => string | Exclude<Child, string>

export interface LiveQueryOptions<State, InvalidationError = never, InvalidationContext = never, StateError = never, StateContext = never> {
  readonly invalidations: Stream.Stream<unknown, InvalidationError, InvalidationContext>
  readonly load: Effect.Effect<State, StateError, StateContext>
  readonly render: View<State>
  readonly patch?: PatchElementsOptions
}

const renderView = <State>(state: State, view: View<State>): string => {
  const rendered = view(state)
  return typeof rendered === "string" ? rendered : render(rendered)
}

export const commandDone = (options?: DatastarNoContentResponseOptions): HttpServerResponse.HttpServerResponse =>
  datastarNoContentResponse(options)

export const currentViewPatchResponse = <State>(
  state: State,
  view: View<State>,
  options?: PatchElementsOptions,
  responseOptions?: DatastarBodyResponseOptions
): HttpServerResponse.HttpServerResponse =>
  datastarPatchElementsResponse(renderView(state, view), options, responseOptions)

export const liveQuery = <State, InvalidationError = never, InvalidationContext = never, StateError = never, StateContext = never>(
  options: LiveQueryOptions<State, InvalidationError, InvalidationContext, StateError, StateContext>
): Stream.Stream<string, InvalidationError | StateError, InvalidationContext | StateContext> => {
  const triggers = Stream.make(undefined as void).pipe(
    Stream.concat(options.invalidations.pipe(Stream.map(() => undefined)))
  )

  return triggers.pipe(
    Stream.mapEffect(() => options.load),
    Stream.map((state) => patchElements(renderView(state, options.render), options.patch))
  )
}

export const liveQueryResponse = <State, InvalidationError = never, StateError = never>(
  options: LiveQueryOptions<State, InvalidationError, never, StateError, never>,
  responseOptions?: DatastarBodyResponseOptions
): HttpServerResponse.HttpServerResponse =>
  datastarEventStreamResponse(liveQuery(options), responseOptions)
