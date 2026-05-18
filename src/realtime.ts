import * as Effect from "effect/Effect"
import type { Child } from "./html.js"
import { render } from "./html.js"
import { sseHeaders } from "./response.js"
import { patchElements, type PatchElementsOptions } from "./sse.js"

export interface Subscription<A> extends AsyncIterable<A>, AsyncIterator<A> {
  close(): void
  return(): Promise<IteratorResult<A>>
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

  return(): Promise<IteratorResult<A>> {
    this.close()
    return Promise.resolve({ done: true, value: undefined })
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

  closeAll(): Effect.Effect<void> {
    return Effect.sync(() => {
      for (const subscription of [...this.subscriptions]) {
        subscription.close()
      }
    })
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

export const eventStreamResponse = (events: AsyncIterable<string>, init?: ResponseInit): Response => {
  const encoder = new TextEncoder()
  const iterator = events[Symbol.asyncIterator]()
  let closed = false

  return new Response(
    new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (closed) {
          return
        }

        try {
          const result = await iterator.next()
          if (result.done === true) {
            closed = true
            controller.close()
            return
          }
          controller.enqueue(encoder.encode(result.value))
        } catch (cause) {
          closed = true
          controller.error(cause)
        }
      },
      async cancel() {
        closed = true
        await iterator.return?.()
      }
    }),
    {
      ...init,
      headers: sseHeaders(init?.headers)
    }
  )
}

export const liveElementsResponse = <A>(
  source: AsyncIterable<A>,
  renderValue: (value: A) => string | Child,
  options?: PatchElementsOptions,
  init?: ResponseInit
): Response => eventStreamResponse(mapToElementPatches(source, renderValue, options), init)
