import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { datastarDocument } from "../src/client.js"
import { dataSignals, mergeAttrs, on, post, signal, text } from "../src/datastar.js"
import { h } from "../src/html.js"
import { platformHtmlResponse, platformPatchSignalsResponse, platformReadSignals, platformRouter } from "../src/platform.js"

export const PlatformCounterSignals = Schema.Struct({
  count: Schema.Number
})

export const platformCounterNode = () => {
  const count = signal<number, "count">("count")

  return h(
    "main",
    mergeAttrs({ id: "platform-counter" }, dataSignals({ count: 0 }, { ifMissing: true })),
    h("h1", {}, "ts-star platform counter"),
    h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
    h("output", text(count), "0")
  )
}

export const platformPage = (): HttpServerResponse.HttpServerResponse =>
  platformHtmlResponse(datastarDocument(platformCounterNode()))

export const platformIncrement: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  never,
  HttpServerRequest.HttpServerRequest
> = Effect.gen(function* () {
  const decoded = yield* Effect.result(platformReadSignals(PlatformCounterSignals))

  if (Result.isFailure(decoded)) {
    return HttpServerResponse.text("Bad signals", { status: 400 })
  }

  return platformPatchSignalsResponse({ count: decoded.success.count + 1 })
})

export const platformCounterRouter = platformRouter(
  HttpRouter.route("GET", "/", platformPage()),
  HttpRouter.route("POST", "/increment", platformIncrement)
)
