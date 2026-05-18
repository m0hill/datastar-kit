import { ds, event, h, props, render, reply, type Child } from "../src/index.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const datastarScript = (): Child => h("script", { type: "module", src: DATASTAR_CDN })
const notFound = (): Response => new Response("Not Found", { status: 404 })

export interface LiveCounterExample {
  readonly page: () => Response
  readonly increment: () => Response
  readonly live: () => Response
  readonly handle: (request: Request) => Response
  readonly shutdown: () => void
  readonly currentCount: () => number
}

export const countFragment = (count: number): Child => h("output", { id: "count" }, count)

const countPatch = (count: number): string => event.patch(countFragment(count))

export const pageNode = (): Child =>
  h(
    "main",
    props({ id: "live-counter" }, ds.init(ds.get("/live"))),
    h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
    countFragment(0)
  )

export const pageView = (): string => render(pageNode())

export const makeLiveCounter = (): LiveCounterExample => {
  const invalidations = new InvalidationBus()
  let count = 0

  const page = (): Response =>
    reply.page({
      head: datastarScript(),
      body: pageNode()
    })

  const increment = (): Response => {
    count += 1
    invalidations.publish()
    return reply.done()
  }

  async function* liveEvents(): AsyncIterable<string> {
    const subscription = invalidations.subscribe()

    yield countPatch(count)

    for await (const _ of subscription) {
      yield countPatch(count)
    }
  }

  const live = (): Response => reply.stream(liveEvents())

  const handle = (request: Request): Response => {
    const url = new URL(request.url)

    if (request.method === "GET" && url.pathname === "/") return page()
    if (request.method === "POST" && url.pathname === "/increment") return increment()
    if (request.method === "GET" && url.pathname === "/live") return live()

    return notFound()
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

// Demo-only invalidation source. Real apps can replace this with Redis,
// database notifications, a queue, or any other AsyncIterable trigger.
interface Subscriber {
  queued: number
  closed: boolean
  resolve?: (() => void) | undefined
}

class InvalidationBus {
  readonly #subscribers = new Set<Subscriber>()
  #closed = false

  publish(): void {
    if (this.#closed) return

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
    if (this.#closed) return
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

            if (!subscriber.closed) yield undefined
          }
        } finally {
          subscriber.closed = true
          subscribers.delete(subscriber)
        }
      }
    }
  }
}

export const createLiveCounter = makeLiveCounter
