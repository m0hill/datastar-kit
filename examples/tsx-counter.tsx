/** @jsx jsx */
/** @jsxFrag Fragment */
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import {
  datastarDocument,
  dataSignals,
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
import { Fragment, jsx } from "../src/jsx.js"

export const TsxCounterSignals = Schema.Struct({
  count: Schema.Number
})

export const tsxCounterNode = () => {
  const count = signal<number, "count">("count")

  return (
    <main {...mergeAttrs({ id: "tsx-counter" }, dataSignals({ count: 0 }, { ifMissing: true }))}>
      <h1>ts-star TSX counter</h1>
      <>
        <button {...mergeAttrs({ type: "button" }, on("click", post("/increment")))}>+</button>
        <output {...text(count)}>0</output>
      </>
    </main>
  )
}

export const tsxCounterView = (): string => render(tsxCounterNode())

export const tsxCounterPage = (): HttpServerResponse.HttpServerResponse =>
  platformHtmlResponse(datastarDocument(tsxCounterNode()))

export const tsxIncrement: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  never,
  HttpServerRequest.HttpServerRequest
> = Effect.gen(function*() {
  const decoded = yield* Effect.result(platformReadSignals(TsxCounterSignals))

  if (Result.isFailure(decoded)) {
    return HttpServerResponse.text("Bad signals", { status: 400 })
  }

  return platformPatchSignalsResponse({ count: decoded.success.count + 1 })
})

export const tsxCounterApp = platformRouter(
  HttpRouter.route("GET", "/", tsxCounterPage()),
  HttpRouter.route("POST", "/increment", tsxIncrement)
)
