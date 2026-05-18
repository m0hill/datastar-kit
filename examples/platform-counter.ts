import * as HttpRouter from "@effect/platform/HttpRouter"
import * as HttpServerError from "@effect/platform/HttpServerError"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Schema from "effect/Schema"
import { datastarDocument } from "../src/client.js"
import { dataSignals, mergeAttrs, on, post, signal, text } from "../src/datastar.js"
import { h } from "../src/html.js"
import { platformHtmlResponse, platformPatchSignalsResponse } from "../src/platform.js"
import { readSignals } from "../src/request.js"

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
  HttpServerError.RequestError,
  HttpServerRequest.HttpServerRequest
> = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest
  const webRequest = yield* HttpServerRequest.toWeb(request)
  const decoded = yield* Effect.either(readSignals(webRequest, PlatformCounterSignals))

  if (Either.isLeft(decoded)) {
    return HttpServerResponse.text("Bad signals", { status: 400 })
  }

  return platformPatchSignalsResponse({ count: decoded.right.count + 1 })
})

export const platformCounterRouter = HttpRouter.empty.pipe(
  HttpRouter.get("/", Effect.succeed(platformPage())),
  HttpRouter.post("/increment", platformIncrement)
)
