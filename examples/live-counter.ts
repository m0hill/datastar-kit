import * as Effect from "effect/Effect"
import * as PubSub from "effect/PubSub"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import {
  ds,
  h,
  live,
  platformRouter,
  props,
  render,
  reply
} from "../src/index.js"

export interface LiveCounterApp {
  readonly app: Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    unknown,
    Scope.Scope | HttpServerRequest.HttpServerRequest
  >
  readonly page: HttpServerResponse.HttpServerResponse
  readonly increment: Effect.Effect<HttpServerResponse.HttpServerResponse>
  readonly live: Effect.Effect<HttpServerResponse.HttpServerResponse>
  readonly updates: PubSub.PubSub<void>
  readonly shutdown: Effect.Effect<void>
  readonly currentCount: () => number
}

export const countFragment = (count: number) => h("output", { id: "count" }, count)

export const pageNode = () =>
  h(
    "main",
    { id: "live-counter" },
    h("div", ds.init(ds.get("/live")), ""),
    h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
    h("output", { id: "count" }, "0")
  )

export const pageView = (): string => render(pageNode())

const liveCounterPubSubOptions = { capacity: 16, replay: 1 } as const

const makeLiveCounterWith = <R>(updatesEffect: Effect.Effect<PubSub.PubSub<void>, never, R>): Effect.Effect<LiveCounterApp, never, R> =>
  Effect.gen(function*() {
    const updates = yield* updatesEffect
    let count = 0

    const page = reply.page(pageNode())

    const loadCount = Effect.sync(() => count)
    const increment = Effect.suspend(() =>
      Effect.sync(() => {
        count += 1
      }).pipe(
        Effect.andThen(PubSub.publish(updates, undefined)),
        Effect.as(reply.done())
      )
    )

    const liveRoute = Effect.sync(() =>
      reply.stream(
        live.query({
          invalidations: Stream.fromPubSub(updates),
          load: loadCount,
          render: countFragment
        })
      )
    )
    const shutdown = PubSub.shutdown(updates)

    return {
      app: platformRouter(
        HttpRouter.route("GET", "/", page),
        HttpRouter.route("POST", "/increment", increment),
        HttpRouter.route("GET", "/live", liveRoute)
      ),
      page,
      increment,
      live: liveRoute,
      updates,
      shutdown,
      currentCount: () => count
    }
  })

const makeLiveCounterPubSub = (): Effect.Effect<PubSub.PubSub<void>> =>
  PubSub.sliding<void>(liveCounterPubSubOptions)

const makeLiveCounterPubSubScoped = () =>
  Effect.gen(function*() {
    const pubsub = yield* makeLiveCounterPubSub()
    yield* Effect.addFinalizer(() => PubSub.shutdown(pubsub))
    return pubsub
  })

export const makeLiveCounter = (): Effect.Effect<LiveCounterApp> =>
  makeLiveCounterWith(makeLiveCounterPubSub())

export const makeLiveCounterScoped = (): Effect.Effect<LiveCounterApp, never, Scope.Scope> =>
  makeLiveCounterWith(makeLiveCounterPubSubScoped())

export const createLiveCounter = (): LiveCounterApp => Effect.runSync(makeLiveCounter())
