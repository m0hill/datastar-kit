import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import {
  ds,
  h,
  props,
  render,
  reply
} from "../src/index.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

export const countNode = (count: number) => h("output", { id: "count" }, count)

export const counterNode = (count = 0) =>
  h(
    "main",
    { id: "counter" },
    h("h1", {}, "ts-star counter"),
    h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
    countNode(count)
  )

export const counterView = (count = 0): string => render(counterNode(count))

export interface CounterExample {
  readonly page: () => HttpServerResponse.HttpServerResponse
  readonly increment: Effect.Effect<HttpServerResponse.HttpServerResponse>
  readonly app: Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    unknown,
    Scope.Scope | HttpServerRequest.HttpServerRequest
  >
  readonly currentCount: () => number
}

export const makeCounter = (): CounterExample => {
  let count = 0

  const page = (): HttpServerResponse.HttpServerResponse =>
    reply.page({
      head: h("script", { type: "module", src: DATASTAR_CDN }),
      body: counterNode(count)
    })

  const increment = Effect.sync(() => {
    count += 1
    return reply.patch(countNode(count), { selector: "#count", mode: "outer" })
  })

  return {
    page,
    increment,
    app: Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
      HttpRouter.route("GET", "/", page()),
      HttpRouter.route("POST", "/increment", increment)
    ]))),
    currentCount: () => count
  }
}

const defaultCounter = makeCounter()

export const page = (): HttpServerResponse.HttpServerResponse => defaultCounter.page()
export const increment = defaultCounter.increment
export const app = defaultCounter.app
