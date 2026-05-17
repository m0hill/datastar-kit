import * as Effect from "effect/Effect"
import {
  datastarPageResponse,
  dataSignals,
  emptyResponse,
  get,
  h,
  init,
  liveElementsResponse,
  mergeAttrs,
  on,
  post,
  render,
  route,
  router
} from "../src/index.js"
import type { Handler } from "../src/handler.js"
import { Broadcaster } from "../src/realtime.js"

export interface LiveCounterApp {
  readonly app: Handler<never, never>
  readonly page: Handler<never, never>
  readonly increment: Handler<never, never>
  readonly live: Handler<never, never>
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

  const page: Handler<never, never> = () => Effect.succeed(datastarPageResponse(pageNode()))

  const increment: Handler<never, never> = () =>
    broadcaster.publish(++count).pipe(
      Effect.as(emptyResponse())
    )

  const live: Handler<never, never> = () =>
    broadcaster.subscribe().pipe(
      Effect.map((subscription) => liveElementsResponse(subscription, countFragment))
    )

  return {
    app: router(route("GET", "/", page), route("POST", "/increment", increment), route("GET", "/live", live)),
    page,
    increment,
    live,
    broadcaster,
    currentCount: () => count
  }
}
