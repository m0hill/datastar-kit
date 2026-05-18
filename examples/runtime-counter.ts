import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import type * as Scope from "effect/Scope"
import { defineSignals } from "../src/contracts.js"
import { mergeAttrs, on, post, text } from "../src/datastar.js"
import { h } from "../src/html.js"
import { platformRouter } from "../src/platform.js"
import { catchMappedErrors, DatastarProtocol, ErrorMapper, requestRuntimeLayer, SignalDecoder } from "../src/runtime.js"

export class CounterStore extends Context.Service<CounterStore, {
  readonly current: Effect.Effect<number>
  readonly increment: Effect.Effect<number>
}>()("examples/runtime-counter/CounterStore") {}

export const CounterStoreLive: Layer.Layer<CounterStore> = Layer.effect(CounterStore)(
  Ref.make(0).pipe(
    Effect.map((count) => ({
      current: Ref.get(count),
      increment: Ref.updateAndGet(count, (value) => value + 1)
    }))
  )
)

export const RuntimeCounter = defineSignals(
  "RuntimeCounter",
  Schema.Struct({
    count: Schema.Number
  })
)

export const RuntimeCounterSignals = RuntimeCounter.schema

export const runtimeCounterNode = (countValue: number) =>
  h(
    "main",
    mergeAttrs({ id: "runtime-counter" }, RuntimeCounter.initial({ count: countValue }, { ifMissing: true })),
    h("h1", {}, "Effect-native runtime counter"),
    h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
    h("output", text(RuntimeCounter.signals.count), countValue)
  )

export const runtimeCounterPage = catchMappedErrors(
  Effect.gen(function*() {
    const store = yield* CounterStore
    const protocol = yield* DatastarProtocol
    const count = yield* store.current
    return yield* protocol.page(runtimeCounterNode(count))
  })
)

export const runtimeCounterIncrement = catchMappedErrors(
  Effect.gen(function*() {
    const decoder = yield* SignalDecoder
    yield* RuntimeCounter.decode(decoder)

    const store = yield* CounterStore
    const protocol = yield* DatastarProtocol
    const count = yield* store.increment

    return yield* protocol.patchSignals(RuntimeCounter.patch({ count }))
  })
)

export const runtimeCounterApp: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  unknown,
  CounterStore | DatastarProtocol | ErrorMapper | SignalDecoder | Scope.Scope | HttpServerRequest.HttpServerRequest
> = platformRouter(
  HttpRouter.route("GET", "/", runtimeCounterPage),
  HttpRouter.route("POST", "/increment", runtimeCounterIncrement)
)

export const runtimeCounterLayer = CounterStoreLive

export const runtimeCounterAppWithRuntime: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  unknown,
  Scope.Scope | HttpServerRequest.HttpServerRequest
> = runtimeCounterApp.pipe(
  Effect.provide(requestRuntimeLayer(), { local: true }),
  Effect.provide(runtimeCounterLayer)
)
