import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import { render, type Child } from "./html.js"
import { patchElements, type PatchElementsOptions } from "./sse.js"

export type View<State> = (state: State) => Child

export interface QueryOptions<State, InvalidationError = never, InvalidationContext = never, StateError = never, StateContext = never> {
  readonly invalidations: Stream.Stream<unknown, InvalidationError, InvalidationContext>
  readonly load: Effect.Effect<State, StateError, StateContext>
  readonly render: View<State>
  readonly patch?: PatchElementsOptions
}

const renderView = <State>(state: State, view: View<State>): string => render(view(state))

export const query = <State, InvalidationError = never, InvalidationContext = never, StateError = never, StateContext = never>(
  options: QueryOptions<State, InvalidationError, InvalidationContext, StateError, StateContext>
): Stream.Stream<string, InvalidationError | StateError, InvalidationContext | StateContext> => {
  const invalidationTriggers = options.invalidations.pipe(Stream.map(() => undefined))
  const triggers = Stream.make(undefined).pipe(Stream.concat(invalidationTriggers))

  return triggers.pipe(
    Stream.mapEffect(() => options.load),
    Stream.map((state) => patchElements(renderView(state, options.render), options.patch))
  )
}
