# T008 — Build realtime live-query architecture

## Status

`pending`

## Why this task exists

`src/realtime.ts` currently maps `PubSub`/`Stream` values to Datastar element patch events. That is useful, but it is event-delta-first.

For a backend-driven framework, realtime should be reconnect-safe and source-of-truth-oriented. A client should be able to reconnect and receive the current view, not depend on having received every intermediate event.

## Target outcome

Create a realtime model based on live queries:

- stream invalidations or current state;
- render current backend state;
- patch elements via Datastar;
- clean up resources on disconnect;
- support heartbeats, backpressure, batching, and reconnect behavior.

## Recommended model

A live query should be closer to:

```ts
LiveQuery.make({
  subscribe: TodoEvents.subscribe,
  load: loadCurrentTodos,
  render: todosView,
  patch: { selector: "#todos", mode: "outer" }
})
```

The stream event says “something changed” or carries a current snapshot. The renderer produces the latest HTML.

## Behavior to define

### Render on connect

The live query should usually send current state immediately when the connection opens.

### Reconnect safety

If the browser reconnects, it should not need missed deltas. It should get current state.

### Heartbeats

Keep connections alive with comments. Current `heartbeatStream` is a good primitive; integrate it into live query defaults.

### Backpressure

When invalidations arrive faster than rendering/network can keep up, prefer dropping/coalescing invalidations and rendering latest state rather than queueing stale renders.

### Cancellation

When request scope ends, subscriptions must release. This should be handled by Effect Scope/Stream finalizers.

### Work sharing

For views shared by many clients, consider later support for caching rendered snapshots per invalidation batch. Do not implement prematurely, but leave the design open.

## Implementation work

- Add live query design doc.
- Add `LiveQuery` prototype using Effect Stream.
- Ensure subscriptions are scoped.
- Add render-on-connect behavior.
- Add coalescing/batching option.
- Add example replacing `live-counter` with current-state rendering.
- Add tests for disconnect cleanup and heartbeat behavior.

## Acceptance criteria

- A live view can reconnect and recover current UI.
- Commands and live queries compose cleanly.
- Slow clients do not accumulate unbounded stale updates.
- Subscriptions are cleaned up on disconnect.
- The example demonstrates backend state as truth.

## Anti-goals

- Do not build a websocket sync engine.
- Do not make event deltas the only realtime model.
- Do not require a database/broker dependency in framework core.
