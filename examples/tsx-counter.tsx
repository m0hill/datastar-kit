/** @jsx jsx */
/** @jsxFrag Fragment */
import {
  ds,
  h,
  props as htmlProps,
  render,
  reply,
  type Child
} from "../src/index.js"
import { Fragment, jsx } from "../src/jsx.js"
import { DATASTAR_CDN } from "./counter.js"

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
  readonly page: () => Response
  readonly increment: () => Response
  readonly handle: (request: Request) => Response
  readonly currentCount: () => number
}

export const makeTsxCounter = (): TsxCounterExample => {
  let count = 0

  const page = (): Response =>
    reply.page({
      head: h("script", { type: "module", src: DATASTAR_CDN }),
      body: tsxCounterNode(count)
    })

  const increment = (): Response => {
    count += 1
    return reply.patch(<CountOutput count={count} />, { selector: "#count", mode: "outer" })
  }

  const handle = (request: Request): Response => {
    const url = new URL(request.url)
    if (request.method === "GET" && url.pathname === "/") {
      return page()
    }
    if (request.method === "POST" && url.pathname === "/increment") {
      return increment()
    }
    return new Response("Not Found", { status: 404 })
  }

  return {
    page,
    increment,
    handle,
    currentCount: () => count
  }
}

const defaultCounter = makeTsxCounter()

export const tsxCounterPage = (): Response => defaultCounter.page()
export const tsxIncrement = (): Response => defaultCounter.increment()
export const handle = (request: Request): Response => defaultCounter.handle(request)
