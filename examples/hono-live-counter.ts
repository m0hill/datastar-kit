import { Hono } from "hono"
import { ds, event, h, props, reply, type Child } from "../src/index.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const datastarScript = (): Child => h("script", { type: "module", src: DATASTAR_CDN })
const countNode = (count: number): Child => h("output", { id: "count" }, count)
const countPatch = (count: number): string => event.patch(countNode(count))

const pageNode = (): Child =>
  h(
    "main",
    props({ id: "live-counter" }, ds.init(ds.get("/live"))),
    h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
    countNode(0)
  )

export const makeHonoLiveCounter = () => {
  const app = new Hono()
  const invalidations = new InvalidationBus()
  let count = 0

  app.get("/", () =>
    reply.page({
      head: datastarScript(),
      body: pageNode()
    })
  )

  app.post("/increment", () => {
    count += 1
    invalidations.publish()
    return reply.done()
  })

  app.get("/live", () => {
    async function* events(): AsyncIterable<string> {
      const subscription = invalidations.subscribe()

      yield countPatch(count)

      for await (const _ of subscription) {
        yield countPatch(count)
      }
    }

    return reply.stream(events())
  })

  return {
    app,
    handle: (request: Request): Response | Promise<Response> => app.fetch(request),
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

const defaultCounter = makeHonoLiveCounter()

export const app = defaultCounter.app
export const handle = (request: Request): Response | Promise<Response> => defaultCounter.handle(request)
export const shutdown = (): void => defaultCounter.shutdown()
export const currentCount = (): number => defaultCounter.currentCount()
