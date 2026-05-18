/** @jsx jsx */
/** @jsxFrag Fragment */
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import type * as Scope from "effect/Scope"
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import {
  datastarDocument,
  datastarPatchElementsResponse,
  mergeAttrs,
  on,
  platformHtmlResponse,
  platformRouter,
  post,
  render,
  type Child
} from "../src/index.js"
import { Fragment, jsx } from "../src/jsx.js"

export interface CounterButtonProps {
  readonly action: string
  readonly children?: Child | readonly Child[]
}

export const CounterButton = (props: CounterButtonProps) =>
  <button {...mergeAttrs({ type: "button" }, on("click", post(props.action)))}>{props.children ?? "+"}</button>

export const CountOutput = (props: { readonly count: number }) => <output id="count">{props.count}</output>

export const tsxCounterNode = (count = 0) => (
  <main id="tsx-counter" className="counter-shell">
    <h1>ts-star TSX counter</h1>
    <CounterButton action="/increment">+</CounterButton>
    <CountOutput count={count} />
  </main>
)

export const tsxCounterView = (count = 0): string => render(tsxCounterNode(count))

export interface TsxCounterExample {
  readonly page: () => HttpServerResponse.HttpServerResponse
  readonly increment: Effect.Effect<HttpServerResponse.HttpServerResponse>
  readonly app: Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    unknown,
    Scope.Scope | HttpServerRequest.HttpServerRequest
  >
  readonly currentCount: () => number
}

export const makeTsxCounter = (): TsxCounterExample => {
  let count = 0

  const tsxCounterPage = (): HttpServerResponse.HttpServerResponse =>
    platformHtmlResponse(datastarDocument(tsxCounterNode(count)))

  const tsxIncrement = Effect.sync(() => {
    count += 1
    return datastarPatchElementsResponse(<CountOutput count={count} />, { selector: "#count", mode: "outer" })
  })

  return {
    page: tsxCounterPage,
    increment: tsxIncrement,
    app: platformRouter(
      HttpRouter.route("GET", "/", tsxCounterPage()),
      HttpRouter.route("POST", "/increment", tsxIncrement)
    ),
    currentCount: () => count
  }
}

const defaultCounter = makeTsxCounter()

export const tsxCounterPage = (): HttpServerResponse.HttpServerResponse => defaultCounter.page()
export const tsxIncrement = defaultCounter.increment
export const tsxCounterApp = defaultCounter.app
