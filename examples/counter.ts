import * as Effect from "effect/Effect"
import type * as Scope from "effect/Scope"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import {
  datastarDocument,
  datastarPatchElementsResponse,
  h,
  mergeAttrs,
  on,
  platformHtmlResponse,
  platformRouter,
  post,
  render
} from "../src/index.js"

export const countNode = (count: number) => h("output", { id: "count" }, count)

export const counterNode = (count = 0) =>
  h(
    "main",
    { id: "counter" },
    h("h1", {}, "ts-star counter"),
    h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
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
    platformHtmlResponse(datastarDocument(counterNode(count)))

  const increment = Effect.sync(() => {
    count += 1
    return datastarPatchElementsResponse(countNode(count), { selector: "#count", mode: "outer" })
  })

  return {
    page,
    increment,
    app: platformRouter(
      HttpRouter.route("GET", "/", page()),
      HttpRouter.route("POST", "/increment", increment)
    ),
    currentCount: () => count
  }
}

const defaultCounter = makeCounter()

export const page = (): HttpServerResponse.HttpServerResponse => defaultCounter.page()
export const increment = defaultCounter.increment
export const app = defaultCounter.app
