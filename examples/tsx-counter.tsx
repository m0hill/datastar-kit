/** @jsx jsx */
/** @jsxFrag Fragment */
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import type * as Scope from "effect/Scope"
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import {
  ds,
  props as htmlProps,
  render,
  reply,
  type Child
} from "../src/index.js"
import { Fragment, jsx } from "../src/jsx.js"

export interface CounterButtonProps {
  readonly action: string
  readonly children?: Child | readonly Child[]
}

export const CounterButton = (button: CounterButtonProps) =>
  <button {...htmlProps({ type: "button" }, ds.on("click", ds.post(button.action)))}>{button.children ?? "+"}</button>

export const CountOutput = (output: { readonly count: number }) => <output id="count">{output.count}</output>

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
    reply.page(tsxCounterNode(count))

  const tsxIncrement = Effect.sync(() => {
    count += 1
    return reply.patch(<CountOutput count={count} />, { selector: "#count", mode: "outer" })
  })

  return {
    page: tsxCounterPage,
    increment: tsxIncrement,
    app: Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
      HttpRouter.route("GET", "/", tsxCounterPage()),
      HttpRouter.route("POST", "/increment", tsxIncrement)
    ]))),
    currentCount: () => count
  }
}

const defaultCounter = makeTsxCounter()

export const tsxCounterPage = (): HttpServerResponse.HttpServerResponse => defaultCounter.page()
export const tsxIncrement = defaultCounter.increment
export const tsxCounterApp = defaultCounter.app
