# Realtime live queries

Realtime in `ts-star` is current-state oriented. A live query is not a stream of fragile UI deltas; it is a stream of render triggers that reload current backend state and patch the browser with the latest server-rendered view.

## Model

A live query has four parts:

```ts
LiveQuery.make({
  invalidations,
  load,
  render,
  patch: { selector: "#todos", mode: "outer" }
})
```

- `invalidations` — an Effect `Stream` of triggers. Payloads may be `void`; they are not authoritative state.
- `load` — reads the current backend state.
- `render` — renders that current state to HTML.
- `patch` — Datastar element patch options.

The default behavior is render-on-connect, then render again after each invalidation.

## Reconnect safety

Because `load` always reads current backend state, a reconnect does not need missed invalidations. The first event on a new live query connection patches the current view.

## Commands compose with live queries

Commands should mutate backend state and publish an invalidation:

```ts
const increment = Effect.sync(() => {
  count += 1
}).pipe(
  Effect.andThen(publishRealtime(updates, undefined)),
  Effect.as(commandDone())
)
```

The live query reacts by loading and rendering current state. Commands do not need to push every UI delta to every client.

## Heartbeats

`liveQueryResponse(options, { heartbeat })` merges SSE comment heartbeats into the live query response:

```ts
liveQueryResponse(query, {
  heartbeat: { interval: "15 seconds", comment: "live" }
})
```

Use an `initialDelay` when finite tests or one-shot streams should not emit a leading heartbeat before the first patch.

## Backpressure and coalescing

When invalidations can arrive faster than rendering/network can consume, set `coalesce`:

```ts
LiveQuery.make({
  invalidations,
  load,
  render,
  coalesce: { capacity: 1, strategy: "sliding" }
})
```

This buffers only the latest pending invalidation instead of growing an unbounded stale queue. The next render still loads current backend state, so dropping older invalidation triggers is safe.

For PubSub sources, prefer sliding/dropping strategies for invalidation hubs unless every event must be processed for non-UI reasons.

## Cancellation and cleanup

Effect Stream subscriptions are scoped. When a response body is canceled or a request/layer scope closes, subscriptions and PubSubs created through scoped helpers are finalized. `LiveQueryHubLive()` shuts down its PubSub when the layer scope closes.

## Deployment and scaling notes

A live view usually means one SSE connection per browser tab or view. Configure reverse proxies to disable buffering for `text/event-stream`, keep idle timeouts longer than the heartbeat interval, and preserve streaming flush behavior. Use bounded invalidation buffers or coalescing when renders can fall behind updates.

Core intentionally does not require a broker. Redis, NATS, Postgres notifications, or app-specific PubSub should adapt into Effect `Stream` invalidations.

## Work sharing

The current API renders per connection. Later versions may cache rendered snapshots per invalidation batch for popular views. The API intentionally treats invalidations as triggers and `load`/`render` as separate steps so that optimization can be added without changing the programming model.

## Current example

`examples/live-counter.ts` demonstrates the model:

- backend `count` is the source of truth;
- `POST /increment` mutates `count` and publishes a void invalidation;
- `GET /live` sends current count immediately on connect and after invalidation;
- reconnecting after missed increments renders the current count.
