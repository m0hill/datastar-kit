import { ds, h, props, render, reply, type Child } from "../src/index.js"
import { patchElements } from "../src/sse.js"
import { DATASTAR_CDN } from "./counter.js"

interface Subscriber {
  queued: number
  closed: boolean
  resolve?: (() => void) | undefined
}

class InvalidationBus {
  readonly #subscribers = new Set<Subscriber>()
  #closed = false

  publish(): void {
    if (this.#closed) {
      return
    }

    for (const subscriber of this.#subscribers) {
      if (subscriber.resolve !== undefined) {
        const resolve = subscriber.resolve
        subscriber.resolve = undefined
        resolve()
      } else {
        subscriber.queued += 1
      }
    }
  }

  close(): void {
    if (this.#closed) {
      return
    }
    this.#closed = true

    for (const subscriber of this.#subscribers) {
      subscriber.closed = true
      subscriber.resolve?.()
    }
  }

  subscribe(): AsyncIterable<void> {
    const subscriber: Subscriber = { queued: 0, closed: this.#closed }
    const subscribers = this.#subscribers
    subscribers.add(subscriber)

    return {
      async *[Symbol.asyncIterator]() {
        try {
          while (!subscriber.closed) {
            if (subscriber.queued > 0) {
              subscriber.queued -= 1
              yield undefined
              continue
            }

            await new Promise<void>((resolve) => {
              subscriber.resolve = resolve
            })
            subscriber.resolve = undefined

            if (!subscriber.closed) {
              yield undefined
            }
          }
        } finally {
          subscriber.closed = true
          subscribers.delete(subscriber)
        }
      }
    }
  }
}

export interface LiveCounterExample {
  readonly page: () => Response
  readonly increment: () => Response
  readonly live: () => Response
  readonly handle: (request: Request) => Response
  readonly shutdown: () => void
  readonly currentCount: () => number
}

export const countFragment = (count: number): Child => h("output", { id: "count" }, count)

export const pageNode = () =>
  h(
    "main",
    { id: "live-counter" },
    h("div", ds.init(ds.get("/live")), ""),
    h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
    h("output", { id: "count" }, "0")
  )

export const pageView = (): string => render(pageNode())

export const makeLiveCounter = (): LiveCounterExample => {
  const invalidations = new InvalidationBus()
  let count = 0

  const page = (): Response =>
    reply.page({
      head: h("script", { type: "module", src: DATASTAR_CDN }),
      body: pageNode()
    })

  const increment = (): Response => {
    count += 1
    invalidations.publish()
    return reply.done()
  }

  async function* liveEvents(): AsyncIterable<string> {
    const subscription = invalidations.subscribe()
    yield patchElements(render(countFragment(count)))
    for await (const _ of subscription) {
      yield patchElements(render(countFragment(count)))
    }
  }

  const live = (): Response => reply.stream(liveEvents())

  const handle = (request: Request): Response => {
    const url = new URL(request.url)
    if (request.method === "GET" && url.pathname === "/") {
      return page()
    }
    if (request.method === "POST" && url.pathname === "/increment") {
      return increment()
    }
    if (request.method === "GET" && url.pathname === "/live") {
      return live()
    }
    return new Response("Not Found", { status: 404 })
  }

  return {
    page,
    increment,
    live,
    handle,
    shutdown: () => invalidations.close(),
    currentCount: () => count
  }
}

export const createLiveCounter = makeLiveCounter
