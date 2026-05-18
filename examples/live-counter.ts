import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import type * as Scope from "effect/Scope"
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import {
  commandDone,
  datastarPageResponse,
  dataSignals,
  get,
  h,
  init,
  liveQueryResponse,
  makeRealtimePubSub,
  makeRealtimePubSubScoped,
  mergeAttrs,
  on,
  platformRouter,
  post,
  publishRealtime,
  render,
  shutdownRealtime,
  streamFromPubSub,
  type RealtimePubSub
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
  readonly updates: RealtimePubSub<void>
  readonly shutdown: Effect.Effect<void>
  readonly currentCount: () => number
}

export const countFragment = (count: number) => h("output", { id: "count" }, count)

export const pageNode = () =>
  h(
    "main",
    mergeAttrs({ id: "live-counter" }, dataSignals({ count: 0 }, { ifMissing: true })),
    h("div", init(get("/live")), ""),
    h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
    h("output", { id: "count" }, "0")
  )

export const pageView = (): string => render(pageNode())

const liveCounterPubSubOptions = { capacity: 16, replay: 1, strategy: "sliding" as const }

const makeLiveCounterWith = <R>(updatesEffect: Effect.Effect<RealtimePubSub<void>, never, R>): Effect.Effect<LiveCounterApp, never, R> =>
  Effect.gen(function*() {
    const updates = yield* updatesEffect
    let count = 0

    const page = datastarPageResponse(pageNode())

    const loadCount = Effect.sync(() => count)
    const increment = Effect.suspend(() =>
      Effect.sync(() => {
        count += 1
      }).pipe(
        Effect.andThen(publishRealtime(updates, undefined)),
        Effect.as(commandDone())
      )
    )

    const live = Effect.sync(() =>
      liveQueryResponse({
        invalidations: streamFromPubSub(updates),
        load: loadCount,
        render: countFragment
      })
    )
    const shutdown = shutdownRealtime(updates)

    return {
      app: platformRouter(
        HttpRouter.route("GET", "/", page),
        HttpRouter.route("POST", "/increment", increment),
        HttpRouter.route("GET", "/live", live)
      ),
      page,
      increment,
      live,
      updates,
      shutdown,
      currentCount: () => count
    }
  })

export const makeLiveCounter = (): Effect.Effect<LiveCounterApp> =>
  makeLiveCounterWith(makeRealtimePubSub<void>(liveCounterPubSubOptions))

export const makeLiveCounterScoped = () =>
  makeLiveCounterWith(makeRealtimePubSubScoped<void>(liveCounterPubSubOptions))

export const createLiveCounter = (): LiveCounterApp => Effect.runSync(makeLiveCounter())
