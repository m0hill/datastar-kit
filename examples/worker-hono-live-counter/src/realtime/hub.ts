import { DurableObject } from "cloudflare:workers"

const LIVE_TODOS_ROOM = "global"

const sseHeaders = {
  "cache-control": "no-cache",
  "content-type": "text/event-stream"
} as const

const textEncoder = new TextEncoder()

export interface VersionedDatastarEvents {
  readonly version: number
  readonly events: string
}

interface LiveSubscriber {
  closed: boolean
  controller?: ReadableStreamDefaultController<Uint8Array>
  heartbeat?: ReturnType<typeof setInterval>
}

export class LiveTodos extends DurableObject<CloudflareBindings> {
  readonly #subscribers = new Set<LiveSubscriber>()
  #latestVersion = 0
  #latestEvents: VersionedDatastarEvents | undefined

  subscribe(initial: VersionedDatastarEvents): Response {
    const events = this.#currentEvents(initial)
    const subscriber: LiveSubscriber = { closed: false }

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        subscriber.controller = controller
        this.#subscribers.add(subscriber)
        this.#send(subscriber, events.events)
        subscriber.heartbeat = setInterval(() => {
          this.#send(subscriber, ": live-todos\n\n")
        }, 15_000)
      },
      cancel: () => {
        this.#close(subscriber)
      }
    })

    return new Response(stream, { headers: sseHeaders })
  }

  publish(update: VersionedDatastarEvents): number {
    if (update.version <= this.#latestVersion) return this.#subscribers.size

    this.#latestVersion = update.version
    this.#latestEvents = update

    for (const subscriber of this.#subscribers) {
      this.#send(subscriber, update.events)
    }

    return this.#subscribers.size
  }

  #currentEvents(initial: VersionedDatastarEvents): VersionedDatastarEvents {
    if (initial.version > this.#latestVersion) {
      this.#latestVersion = initial.version
      this.#latestEvents = initial
      return initial
    }

    return this.#latestEvents ?? initial
  }

  #send(subscriber: LiveSubscriber, chunk: string) {
    if (subscriber.closed || subscriber.controller === undefined) return

    try {
      subscriber.controller.enqueue(textEncoder.encode(chunk))
    } catch {
      this.#close(subscriber)
    }
  }

  #close(subscriber: LiveSubscriber) {
    if (subscriber.closed) return
    subscriber.closed = true
    clearInterval(subscriber.heartbeat)
    this.#subscribers.delete(subscriber)
  }
}

export const liveTodos = (env: CloudflareBindings) => env.LIVE_TODOS.getByName(LIVE_TODOS_ROOM)
