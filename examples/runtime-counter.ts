import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import type * as Scope from "effect/Scope"
import * as contract from "../src/contract.js"
import * as ds from "../src/ds.js"
import { h, props } from "../src/html.js"
import * as read from "../src/read.js"
import * as reply from "../src/reply.js"

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

export const RuntimeCounter = contract.signals(
  Schema.Struct({
    count: Schema.Number
  })
)

export const RuntimeCounterSignals = RuntimeCounter.schema

export const runtimeCounterNode = (countValue: number) =>
  h(
    "main",
    props({ id: "runtime-counter" }, RuntimeCounter.initial({ count: countValue }, { ifMissing: true })),
    h("h1", {}, "Effect services counter"),
    h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
    h("output", ds.text(RuntimeCounter.$.count), countValue)
  )

export const runtimeCounterPage = Effect.gen(function*() {
  const store = yield* CounterStore
  const count = yield* store.current
  return reply.page(runtimeCounterNode(count))
})

export const runtimeCounterIncrement = Effect.gen(function*() {
  yield* read.signals(RuntimeCounter.schema)

  const store = yield* CounterStore
  const count = yield* store.increment

  return reply.signals(RuntimeCounter.patch({ count }))
})

export const runtimeCounterApp: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  unknown,
  CounterStore | Scope.Scope | HttpServerRequest.HttpServerRequest
> = Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
  HttpRouter.route("GET", "/", runtimeCounterPage),
  HttpRouter.route("POST", "/increment", runtimeCounterIncrement)
])))

export const runtimeCounterLayer = CounterStoreLive

export const runtimeCounterAppWithServices: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  unknown,
  Scope.Scope | HttpServerRequest.HttpServerRequest
> = runtimeCounterApp.pipe(
  Effect.provide(runtimeCounterLayer)
)
