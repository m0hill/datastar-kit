/** @jsx jsx */
import { ds, render, reply, type Child } from "../src/index.js"
import { jsx } from "../src/jsx.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const datastarScript = (): Child => <script type="module" src={DATASTAR_CDN}></script>
const notFound = (): Response => new Response("Not Found", { status: 404 })

export interface CounterButtonProps {
  readonly action: string
  readonly children?: Child | readonly Child[]
}

export const CounterButton = ({ action, children = "+" }: CounterButtonProps) => (
  <button type="button" {...ds.on("click", ds.post(action))}>{children}</button>
)

export const CountOutput = ({ count }: { readonly count: number }) =>
  <output id="count">{count}</output>

export const tsxCounterNode = (count = 0): Child => (
  <main id="tsx-counter" className="counter-shell">
    <h1>ts-star TSX counter</h1>
    <CounterButton action="/increment" />
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
      head: datastarScript(),
      body: tsxCounterNode(count)
    })

  const increment = (): Response => {
    count += 1
    return reply.patch(<CountOutput count={count} />, { selector: "#count" })
  }

  const handle = (request: Request): Response => {
    const url = new URL(request.url)

    if (request.method === "GET" && url.pathname === "/") return page()
    if (request.method === "POST" && url.pathname === "/increment") return increment()

    return notFound()
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
