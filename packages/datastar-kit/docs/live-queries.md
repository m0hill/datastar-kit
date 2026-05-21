# Realtime live query recipes

Realtime in Datastar Kit is current-state oriented. A live view should not be a stream of fragile UI deltas. It should reload current backend state on connect and after app-owned invalidation triggers.

Core intentionally does not export a `live` namespace, PubSub, broker abstraction, or runtime service. Build the recipe locally and return it with `reply.stream(...)`.

```ts
import { event, reply } from "datastar-kit"

async function* liveEvents() {
  yield event.patch(renderCurrentState())
  for await (const _ of invalidations) {
    yield event.patch(renderCurrentState())
  }
}

return reply.stream(liveEvents(), {
  heartbeat: { intervalMs: 15_000, comment: "live" }
})
```

A live recipe has four parts:

- `invalidations` — an app-owned `AsyncIterable` of triggers. Payloads are not authoritative state.
- `load` — reads current backend state.
- `render` — renders that current state to HTML with stable IDs on top-level elements.
- patch options — optional Datastar element patch settings for container-targeted updates.

## Reconnect safety

Because each render reads current backend state, reconnecting does not need missed invalidations. The first event on a new live connection should patch the current view.

## App-owned invalidation resources

Use whatever resource matches the app: database notifications, Redis, NATS, in-memory subscribers, queues, or framework-specific channels. Adapt them to `AsyncIterable` or `ReadableStream` and pass generated SSE event strings to `reply.stream(...)`.

## Heartbeats

Heartbeat comments are transport-level response behavior, so they live on `reply.stream(...)`:

```ts
reply.stream(events, {
  heartbeat: { intervalMs: 15_000, comment: "live" }
})
```

Use `initialDelayMs` when finite tests or one-shot streams should not emit a leading heartbeat before the first patch.

## Deployment and scaling notes

A live view usually means one SSE connection per browser tab or view. Configure reverse proxies to disable buffering for `text/event-stream`, keep idle timeouts longer than the heartbeat interval, and preserve streaming flush behavior.
