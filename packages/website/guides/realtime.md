# Realtime

Realtime Datastar Kit views are current-state streams. A stream sends the current view when it connects, then sends a fresh view whenever your app says something changed.

```tsx
import { event, reply } from "datastar-kit"

async function* todoEvents(userId: string) {
  yield event.patch(<TodoList todos={await todos.forUser(userId)} />)

  for await (const _ of todoInvalidations.forUser(userId)) {
    yield event.patch(<TodoList todos={await todos.forUser(userId)} />)
  }
}

return reply.stream(todoEvents(user.id), {
  heartbeat: { intervalMs: 15_000, comment: "todos" }
})
```

The invalidation does not need to contain the full update. It only needs to wake the stream so the handler can reload current backend state.

## Live view parts

| Part                | Responsibility                                               |
| ------------------- | ------------------------------------------------------------ |
| Invalidation source | App-owned async source of "something changed" events.        |
| Load function       | Reads current backend state.                                 |
| View function       | Renders that state to HTML.                                  |
| Stream response     | Sends `event.patch(...)` chunks through `reply.stream(...)`. |

Good invalidation sources include in-memory subscribers, Redis pub/sub, NATS, Postgres notifications, queues, Durable Objects, or framework-specific channels. Adapt them to an `AsyncIterable`, `Iterable`, or `ReadableStream` accepted by `reply.stream(...)`.

## Reconnect safety

The first event on a live connection should render current state. If a browser tab disconnects and reconnects, it should not need missed events to recover.

This rule also keeps multi-tab and multi-process behavior simpler. The stream always asks the backend what is true now.

## Heartbeats

Heartbeat comments keep long-lived SSE connections active across proxies and platforms:

```ts
return reply.stream(events, {
  heartbeat: {
    intervalMs: 15_000,
    initialDelayMs: 15_000,
    comment: "live"
  }
})
```

Heartbeats are response behavior, so they live on `reply.stream(...)` options instead of inside the event generator. If a stream source needs to emit an ad-hoc SSE comment, yield `event.comment("note")`; prefer the `heartbeat` option for regular keepalives.

## Cancellation

When your framework exposes a request `AbortSignal`, connect it to the subscription or stream source so disconnected clients do not leave subscribers running.

The exact wiring depends on the runtime. The important part is ownership: Datastar Kit writes the SSE response; your app owns the lifetime of database, broker, or in-memory subscriptions.

## Deployment

A live view usually means one SSE connection per browser tab or active view. Configure proxies to avoid buffering `text/event-stream`, keep idle timeouts longer than the heartbeat interval, and preserve streaming flush behavior.

Next: [Security](security.md).
