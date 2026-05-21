# Realtime streams

Realtime in Datastar Kit is current-state oriented. A live view renders the latest backend state when it connects, then renders again after app-owned invalidation triggers.

```ts
import { event, reply } from 'datastar-kit'

async function* liveEvents() {
  yield event.patch(renderCurrentState())
  for await (const _ of invalidations) {
    yield event.patch(renderCurrentState())
  }
}

return reply.stream(liveEvents(), {
  heartbeat: { intervalMs: 15_000, comment: 'live' }
})
```

A live view has four parts:

- `invalidations` — an app-owned `AsyncIterable` of triggers.
- `load` — reads current backend state.
- `render` — renders that current state to HTML.
- patch options — optional Datastar element patch settings for container-targeted updates.

## Reconnect safety

Because each render reads current backend state, reconnecting can recover by rendering the latest view. The first event on a new live connection should patch the current view.

## App-owned invalidation resources

Use whatever resource matches the app: database notifications, Redis, NATS, in-memory subscribers, queues, or framework-specific channels. Adapt them to `AsyncIterable` or `ReadableStream` and pass generated SSE event strings to `reply.stream(...)`.

## Heartbeats

Heartbeat comments are transport-level response behavior, so they live on `reply.stream(...)` options, not in the event generator itself.

Use `initialDelayMs` for finite tests or one-shot streams where the first patch should arrive before the first heartbeat.

## Deployment notes

A live view usually means one SSE connection per browser tab or active view. Configure reverse proxies to disable buffering for `text/event-stream`, keep idle timeouts longer than the heartbeat interval, and preserve streaming flush behavior. The deployment checklist has the operational version of this topic.

Next: [Security](security.md). Related: [Deployment](deployment.md), [Programming model](../concepts/programming-model.md).
