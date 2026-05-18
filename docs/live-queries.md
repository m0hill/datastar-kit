# Realtime live queries

Realtime in `ts-star` is current-state oriented. A live query is not a stream of fragile UI deltas. It is a stream of invalidation triggers that reloads current backend state and patches the browser with the latest server-rendered view.

## Public model

Use `live.query(...)` to create Datastar SSE events and `reply.stream(...)` to return them:

```ts
return reply.stream(
  live.query({
    invalidations: Stream.fromPubSub(updates),
    load: Effect.sync(() => count),
    render: (count) => h("output", { id: "count" }, count),
    patch: { selector: "#count", mode: "outer" }
  }),
  { heartbeat: { interval: "15 seconds" } }
)
```

A live query has four parts:

- `invalidations` — an Effect `Stream` of triggers. Payloads are ignored by `live.query`; they are not authoritative state.
- `load` — reads current backend state.
- `render` — renders that current state to HTML.
- `patch` — optional Datastar element patch options.

`live.query(...)` always renders once when the connection opens, then renders again after each invalidation.

## Reconnect safety

Because `load` always reads current backend state, a reconnect does not need missed invalidations. The first event on a new live query connection patches the current view.

## App-owned invalidation resources

`ts-star` does not expose a PubSub/broker abstraction. Apps own invalidation resources and adapt them into an Effect `Stream`:

```ts
const updates = yield* PubSub.sliding<void>({ capacity: 16, replay: 1 })

yield* PubSub.publish(updates, undefined)

const invalidations = Stream.fromPubSub(updates)
```

Database notifications, Redis, NATS, in-memory PubSub, or any other source should adapt to the same `Stream` shape.

## Commands compose with live queries

Commands mutate backend state and publish an invalidation. They do not push every UI delta to every connected client:

```ts
const increment = Effect.sync(() => {
  count += 1
}).pipe(
  Effect.andThen(PubSub.publish(updates, undefined)),
  Effect.as(reply.done())
)
```

The live query reacts by loading and rendering current state.

## Heartbeats

Heartbeat comments are transport-level response behavior, so they live on `reply.stream(...)`:

```ts
reply.stream(live.query(query), {
  heartbeat: { interval: "15 seconds", comment: "live" }
})
```

Use `initialDelay` when finite tests or one-shot streams should not emit a leading heartbeat before the first patch.

## Backpressure and coalescing

`live.query(...)` does not expose coalescing options. Shape the invalidation stream explicitly before passing it in:

```ts
const invalidations = rawInvalidations.pipe(
  Stream.buffer({ capacity: 1, strategy: "sliding" })
)
```

This keeps the framework API small and makes buffering policy local to the app/resource that owns the invalidation stream. The next render still loads current backend state, so dropping older invalidation triggers is safe for UI refreshes.

## Cancellation and cleanup

Effect Stream subscriptions are scoped by the response body/request lifecycle. PubSubs, database subscriptions, and broker clients remain app-owned resources and should be scoped by the app.

## Deployment and scaling notes

A live view usually means one SSE connection per browser tab or view. Configure reverse proxies to disable buffering for `text/event-stream`, keep idle timeouts longer than the heartbeat interval, and preserve streaming flush behavior.

Core intentionally does not require a broker. Redis, NATS, Postgres notifications, or app-specific PubSub should adapt into Effect `Stream` invalidations.

## Current example

`examples/live-counter.ts` demonstrates the model:

- backend `count` is the source of truth;
- `POST /increment` mutates `count` and publishes a void invalidation;
- `GET /live` sends current count immediately on connect and after invalidation;
- reconnecting after missed increments renders the current count.
