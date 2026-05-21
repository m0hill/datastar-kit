import { ds, event, reply } from "datastar-kit"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

export function makeLiveCounter() {
  const invalidations = new InvalidationBus()
  let count = 0

  const Count = () => <output id="count">{count}</output>

  const LiveCounter = () => (
    <main id="live-counter" {...ds.init(ds.get("/live"))}>
      <button type="button" {...ds.on("click", ds.post("/increment"))}>+</button>
      <Count />
    </main>
  )

  function handle(request: Request) {
    const url = new URL(request.url)

    if (request.method === "GET" && url.pathname === "/") {
      return reply.page(<LiveCounter />, { head: <script type="module" src={DATASTAR_CDN} /> })
    }

    if (request.method === "POST" && url.pathname === "/increment") {
      count += 1
      invalidations.publish()
      return reply.done()
    }

    if (request.method === "GET" && url.pathname === "/live") {
      async function* events() {
        const currentCountPatch = () => event.patchElements(<Count />)
        const subscription = invalidations.subscribe()

        yield currentCountPatch()

        for await (const _ of subscription) {
          yield currentCountPatch()
        }
      }

      return reply.stream(events())
    }

    return new Response("Not Found", { status: 404 })
  }

  return {
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
