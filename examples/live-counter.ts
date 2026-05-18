import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import type * as Scope from "effect/Scope"
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import {
  datastarPageResponse,
  dataSignals,
  get,
  h,
  init,
  liveElementsResponse,
  mergeAttrs,
  on,
  platformRouter,
  post,
  render
} from "../src/index.js"
import { Broadcaster } from "../src/realtime.js"

export interface LiveCounterApp {
  readonly app: Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    unknown,
    Scope.Scope | HttpServerRequest.HttpServerRequest
  >
  readonly page: HttpServerResponse.HttpServerResponse
  readonly increment: Effect.Effect<HttpServerResponse.HttpServerResponse>
  readonly live: Effect.Effect<HttpServerResponse.HttpServerResponse>
  readonly broadcaster: Broadcaster<number>
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

export const createLiveCounter = (): LiveCounterApp => {
  const broadcaster = new Broadcaster<number>()
  let count = 0

  const page = datastarPageResponse(pageNode())

  const increment = Effect.suspend(() =>
    broadcaster.publish(++count).pipe(
      Effect.as(HttpServerResponse.empty())
    )
  )

  const live = broadcaster.subscribe().pipe(
    Effect.map((subscription) => liveElementsResponse(subscription, countFragment))
  )

  return {
    app: platformRouter(
      HttpRouter.route("GET", "/", page),
      HttpRouter.route("POST", "/increment", increment),
      HttpRouter.route("GET", "/live", live)
    ),
    page,
    increment,
    live,
    broadcaster,
    currentCount: () => count
  }
}
