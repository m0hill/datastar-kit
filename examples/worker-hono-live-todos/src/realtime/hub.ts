import { DurableObject } from "cloudflare:workers"
import { reply } from "datastar-kit"

type LiveIteratorResult = IteratorResult<string, undefined>

export interface VersionedDatastarPatch {
  readonly version: number
  readonly events: string
}

interface LiveSubscriber {
  closed: boolean
  queued: string[]
  resolve?: ((result: LiveIteratorResult) => void) | undefined
}

// One generic DO class can back many named live rooms:
//   env.LIVE_ROOMS.getByName(`workspace:${workspaceId}:board`)
//   env.LIVE_ROOMS.getByName(`issue:${issueId}`)
// This example uses a single "todos" room, but the class is intentionally resource-agnostic.
export class LiveRoom extends DurableObject<CloudflareBindings> {
  readonly #subscribers = new Set<LiveSubscriber>()
  #latestVersion = 0
  #latestEvents: VersionedDatastarPatch | undefined

  subscribe(initial: VersionedDatastarPatch): Response {
    const events = this.#currentEvents(initial)
    const subscriber: LiveSubscriber = { closed: false, queued: [events.events] }

    this.#subscribers.add(subscriber)

    return reply.stream(this.#events(subscriber), {
      heartbeat: { intervalMs: 15_000, comment: "live-room" }
    })
  }

  publish(update: VersionedDatastarPatch): number {
    // Equal-version publishes are still fanned out: a reconnect can observe the latest DB version
    // before the mutation fan-out reaches older subscribers.
    if (update.version < this.#latestVersion) return this.#subscribers.size

    this.#latestVersion = update.version
    this.#latestEvents = update

    for (const subscriber of this.#subscribers) {
      this.#send(subscriber, update.events)
    }

    return this.#subscribers.size
  }

  #currentEvents(initial: VersionedDatastarPatch): VersionedDatastarPatch {
    if (initial.version > this.#latestVersion) {
      this.#latestVersion = initial.version
      this.#latestEvents = initial
      return initial
    }

    return this.#latestEvents ?? initial
  }

  #events(subscriber: LiveSubscriber): AsyncIterableIterator<string> {
    return {
      [Symbol.asyncIterator]() {
        return this
      },
      next: () => this.#next(subscriber),
      return: () => {
        this.#close(subscriber)
        return Promise.resolve({ done: true, value: undefined })
      }
    }
  }

  #next(subscriber: LiveSubscriber): Promise<LiveIteratorResult> {
    if (subscriber.closed) return Promise.resolve({ done: true, value: undefined })

    const value = subscriber.queued.shift()
    if (value !== undefined) return Promise.resolve({ done: false, value })

    return new Promise<LiveIteratorResult>((resolve) => {
      subscriber.resolve = resolve
    })
  }

  #send(subscriber: LiveSubscriber, chunk: string) {
    if (subscriber.closed) return

    subscriber.queued.push(chunk)
    const resolve = subscriber.resolve
    if (resolve === undefined) return

    subscriber.resolve = undefined
    resolve(this.#nextQueued(subscriber))
  }

  #nextQueued(subscriber: LiveSubscriber): LiveIteratorResult {
    const value = subscriber.queued.shift()
    return value === undefined || subscriber.closed
      ? { done: true, value: undefined }
      : { done: false, value }
  }

  #close(subscriber: LiveSubscriber) {
    if (subscriber.closed) return
    subscriber.closed = true
    const resolve = subscriber.resolve
    subscriber.resolve = undefined
    resolve?.({ done: true, value: undefined })
    this.#subscribers.delete(subscriber)
  }
}

export const liveRoom = (env: CloudflareBindings, name: string) => env.LIVE_ROOMS.getByName(name)
