import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import {
  datastarDocument,
  dataSignals,
  h,
  mergeAttrs,
  on,
  platformHtmlResponse,
  platformPatchSignalsResponse,
  platformReadSignals,
  platformRouter,
  post,
  render,
  signal,
  text
} from "../src/index.js"

export const CounterSignals = Schema.Struct({
  count: Schema.Number
})

export const counterNode = () => {
  const count = signal<number, "count">("count")

  return h(
    "main",
    mergeAttrs({ id: "counter" }, dataSignals({ count: 0 }, { ifMissing: true })),
    h("h1", {}, "ts-star counter"),
    h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
    h("output", text(count), "0")
  )
}

export const counterView = (): string => render(counterNode())

export const page = (): HttpServerResponse.HttpServerResponse =>
  platformHtmlResponse(datastarDocument(counterNode()))

export const increment: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  never,
  HttpServerRequest.HttpServerRequest
> = Effect.gen(function* () {
  const decoded = yield* Effect.result(platformReadSignals(CounterSignals))

  if (Result.isFailure(decoded)) {
    return HttpServerResponse.text("Bad signals", { status: 400 })
  }

  return platformPatchSignalsResponse({ count: decoded.success.count + 1 })
})

export const app = platformRouter(
  HttpRouter.route("GET", "/", page()),
  HttpRouter.route("POST", "/increment", increment)
)
