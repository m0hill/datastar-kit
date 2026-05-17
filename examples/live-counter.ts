import * as Effect from "effect/Effect"
import {
  dataSignals,
  get,
  h,
  htmlResponse,
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

export const countFragment = (count: number): string => render(h("output", { id: "count" }, count))

export const pageView = (): string =>
  render(
    h(
      "main",
      mergeAttrs({ id: "live-counter" }, dataSignals({ count: 0 }, { ifMissing: true })),
      h("div", init(get("/live")), ""),
      h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
      h("output", { id: "count" }, "0")
    )
  )

export const createLiveCounter = (): LiveCounterApp => {
  const broadcaster = new Broadcaster<number>()
  let count = 0

  const page: Handler<never, never> = () => Effect.succeed(htmlResponse(pageView()))

  const increment: Handler<never, never> = () =>
    broadcaster.publish(++count).pipe(
      Effect.as(new Response(null, { status: 204 }))
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
