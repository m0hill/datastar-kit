import * as Effect from "effect/Effect"
import type { Child } from "./html.js"
import { render } from "./html.js"
import { patchElements, type PatchElementsOptions } from "./sse.js"

export interface Subscription<A> extends AsyncIterable<A>, AsyncIterator<A> {
  close(): void
}

class BroadcastSubscription<A> implements Subscription<A> {
  private readonly queue: Array<A> = []
  private readonly waiting: Array<(result: IteratorResult<A>) => void> = []
  private closed = false

  constructor(private readonly onClose: (subscription: BroadcastSubscription<A>) => void) {}

  push(value: A): void {
    if (this.closed) {
      return
    }

    const waiter = this.waiting.shift()
    if (waiter !== undefined) {
      waiter({ done: false, value })
      return
    }

    this.queue.push(value)
  }

  next(): Promise<IteratorResult<A>> {
    if (this.queue.length > 0) {
      return Promise.resolve({ done: false, value: this.queue.shift() as A })
    }

    if (this.closed) {
      return Promise.resolve({ done: true, value: undefined })
    }

    return new Promise((resolve) => {
      this.waiting.push(resolve)
    })
  }

  close(): void {
    if (this.closed) {
      return
    }

    this.closed = true
    this.onClose(this)

    for (const waiter of this.waiting.splice(0)) {
      waiter({ done: true, value: undefined })
    }
  }

  [Symbol.asyncIterator](): AsyncIterator<A> {
    return this
  }
}

export class Broadcaster<A> {
  private readonly subscriptions = new Set<BroadcastSubscription<A>>()

  publish(value: A): Effect.Effect<void> {
    return Effect.sync(() => {
      for (const subscription of this.subscriptions) {
        subscription.push(value)
      }
    })
  }

  subscribe(): Effect.Effect<Subscription<A>> {
    return Effect.sync(() => {
      const subscription = new BroadcastSubscription<A>((closed) => {
        this.subscriptions.delete(closed)
      })
      this.subscriptions.add(subscription)
      return subscription
    })
  }

  size(): Effect.Effect<number> {
    return Effect.sync(() => this.subscriptions.size)
  }
}

export const makeBroadcaster = <A>(): Effect.Effect<Broadcaster<A>> => Effect.succeed(new Broadcaster<A>())

export async function* mapToElementPatches<A>(
  source: AsyncIterable<A>,
  renderValue: (value: A) => string | Child,
  options?: PatchElementsOptions
): AsyncIterable<string> {
  for await (const value of source) {
    const html = renderValue(value)
    yield patchElements(typeof html === "string" ? html : render(html), options)
  }
}

export const eventStreamResponse = (events: AsyncIterable<string>): Response => {
  const encoder = new TextEncoder()

  return new Response(
    new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of events) {
            controller.enqueue(encoder.encode(event))
          }
          controller.close()
        } catch (cause) {
          controller.error(cause)
        }
      }
    }),
    {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        connection: "keep-alive"
      }
    }
  )
}

export const liveElementsResponse = <A>(
  source: AsyncIterable<A>,
  renderValue: (value: A) => string | Child,
  options?: PatchElementsOptions
): Response => eventStreamResponse(mapToElementPatches(source, renderValue, options))
