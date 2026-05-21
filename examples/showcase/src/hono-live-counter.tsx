import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

export function makeHonoLiveCounter() {
  const app = new Hono()
  const invalidations = new InvalidationBus()
  let count = 0

  app.get("/", () =>
    reply.page(
      <main id="live-counter" {...ds.init(ds.get("/live"))}>
        <button type="button" {...ds.on("click", ds.post("/increment"))}>+</button>
        <output id="count">{count}</output>
      </main>,
      { head: <script type="module" src={DATASTAR_CDN}></script> }
    )
  )

  app.post("/increment", () => {
    count += 1
    invalidations.publish()
    return reply.done()
  })

  app.get("/live", () => {
    async function* events() {
      const currentCountPatch = () => event.patch(<output id="count">{count}</output>)
      const subscription = invalidations.subscribe()

      yield currentCountPatch()

      for await (const _ of subscription) {
        yield currentCountPatch()
      }
    }

    return reply.stream(events())
  })

  return {
    app,
    handle: (request: Request) => app.fetch(request),
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

const counter = makeHonoLiveCounter()

export const app = counter.app

export function handle(request: Request) {
  return counter.handle(request)
}

export function shutdown() {
  counter.shutdown()
}
