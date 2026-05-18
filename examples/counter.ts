import { ds, h, props, render, reply, type Child } from "../src/index.js"

export const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const datastarScript = (): Child => h("script", { type: "module", src: DATASTAR_CDN })
const notFound = (): Response => new Response("Not Found", { status: 404 })

export const countNode = (count: number): Child => h("output", { id: "count" }, count)

const incrementButton = (): Child =>
  h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+")

export const counterNode = (count = 0): Child =>
  h(
    "main",
    { id: "counter" },
    h("h1", {}, "ts-star counter"),
    incrementButton(),
    countNode(count)
  )

export const counterView = (count = 0): string => render(counterNode(count))

export interface CounterExample {
  readonly page: () => Response
  readonly increment: () => Response
  readonly handle: (request: Request) => Response
  readonly currentCount: () => number
}

export const makeCounter = (): CounterExample => {
  let count = 0

  const page = (): Response =>
    reply.page({
      head: datastarScript(),
      body: counterNode(count)
    })

  const increment = (): Response => {
    count += 1
    return reply.patch(countNode(count), { selector: "#count" })
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

const defaultCounter = makeCounter()

export const page = (): Response => defaultCounter.page()
export const increment = (): Response => defaultCounter.increment()
export const handle = (request: Request): Response => defaultCounter.handle(request)
