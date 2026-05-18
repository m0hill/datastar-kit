# T008 — Define `live.query` as the only core realtime abstraction

## Status

`pending`

## Grill level

`4/5` — major public-shape decision.

## Settled decisions

1. Core realtime means **current-state live queries**, not a generic realtime toolbox.
2. Public API should be lowercase and contextual: `live.query(...)`.
3. `live.query(...)` returns a Datastar SSE event `Stream<string>`.
4. HTTP response construction stays in `reply`: use `reply.stream(live.query(...), options)`.
5. `live.query(...)` accepts only an Effect `Stream` of invalidation triggers.
6. Apps own `PubSub`, database notifications, broker subscriptions, and other invalidation resources.
7. `live.query(...)` always renders current state on connection.
8. Invalidation payloads are intentionally ignored by the blessed API; they are triggers, not UI deltas.
9. `live.query(...)` is element-patch-only: `load` current state, `render` HTML, encode `patchElements`.
10. Coalescing/backpressure is not a public `live.query` option for now; apps shape the invalidation `Stream` explicitly.
11. Heartbeat is transport-level behavior and belongs on `reply.stream(..., { heartbeat })`, not in a public realtime toolbox.
12. `load` failures should fail the stream; apps handle errors explicitly by wrapping `load` or the returned stream.
13. Remove old `Model`/`Realtime` app-facing surfaces instead of keeping compatibility aliases.

## Target API

```ts
import * as Effect from "effect/Effect"
import * as PubSub from "effect/PubSub"
import * as Stream from "effect/Stream"
import { ds, h, live, props, reply } from "ts-star"

const updates = yield* PubSub.sliding<void>(16)

const page = reply.page(
  h(
    "main",
    { id: "counter" },
    h("div", ds.init(ds.get("/live")), ""),
    h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
    h("output", { id: "count" }, "0")
  )
)

const liveRoute = reply.stream(
  live.query({
    invalidations: Stream.fromPubSub(updates),
    load: Effect.sync(() => count),
    render: (count) => h("output", { id: "count" }, count),
    patch: { selector: "#count", mode: "outer" }
  }),
  { heartbeat: { interval: "15 seconds" } }
)
```

## Why this task exists

The current implementation still has overlapping realtime concepts:

- `Model.liveQuery` / `Model.liveQueryResponse`;
- `Realtime` PubSub helpers;
- generic live element response helpers;
- heartbeat helpers in `realtime.ts`;
- old `Model` convenience helpers such as `commandDone` and `currentViewPatchResponse`.

That creates multiple ways to stream UI updates and keeps the framework looking broader than it should be.

The framework identity is simpler:

- apps own invalidation resources;
- live queries render current backend state;
- reconnects recover by rendering current state immediately;
- `reply.stream` turns event streams into HTTP responses.

## Public API shape

### Add / expose

```ts
live.query(options)
```

Where options are intentionally small:

```ts
interface LiveQueryOptions<State, IE = never, IR = never, SE = never, SR = never> {
  readonly invalidations: Stream.Stream<unknown, IE, IR>
  readonly load: Effect.Effect<State, SE, SR>
  readonly render: (state: State) => string | Child
  readonly patch?: PatchElementsOptions
}
```

`live.query(...)` returns:

```ts
Stream.Stream<string, IE | SE, IR | SR>
```

### Response construction

Do:

```ts
return reply.stream(live.query(options))
return reply.stream(live.query(options), { heartbeat: { interval: "15 seconds" } })
```

Do not expose public core helpers like:

```ts
live.response(...)
liveQueryResponse(...)
Model.liveQueryResponse(...)
Realtime.eventStreamResponse(...)
```

Reason: `reply` owns HTTP response construction after T003.

### Invalidation streams

Accept only Effect `Stream`:

```ts
live.query({ invalidations: Stream.fromPubSub(pubsub), ... })
```

Do not accept PubSub or AsyncIterable convenience inputs in `live.query`.

Reason: app-owned resources should stay explicit. Effect already provides the adaptation layer.

### Render-on-connect

Always render current state when the stream opens.

Remove:

```ts
renderOnConnect?: boolean
```

If an app wants an event-only stream, it should use `reply.stream(...)` directly instead of `live.query(...)`.

### Invalidation payloads

`live.query` should ignore invalidation values.

Invalidations mean “something changed”; they are not durable state and not UI deltas. Apps that need key-specific invalidation can filter/map the `Stream` before passing it in or close over request-specific values in `load`.

### Coalescing/backpressure

Remove public `coalesce` options for now.

Apps should shape the stream explicitly:

```ts
const invalidations = rawInvalidations.pipe(
  Stream.buffer({ capacity: 1, strategy: "sliding" })
)
```

This keeps framework API smaller and avoids exposing low-level buffering policy as a live-query feature.

### Heartbeats

Move heartbeat support to `reply.stream` options:

```ts
reply.stream(events, {
  heartbeat: { interval: "15 seconds", comment: "heartbeat" }
})
```

Keep heartbeat implementation helpers internal.

## Removal/internal candidates

Remove from public API:

- `Model` realtime namespace/surface;
- `Realtime` namespace/surface;
- `liveQueryResponse`;
- `LiveQuery` object alias;
- `commandDone`;
- `currentViewPatchResponse`;
- `RealtimeStream` alias;
- `makeRealtimePubSub`;
- `makeRealtimePubSubScoped`;
- `makeBroadcaster`;
- `publishRealtime`;
- `shutdownRealtime`;
- `streamFromPubSub`;
- `liveElementsResponse`;
- `liveElementsPubSubResponse`;
- `mapToElementPatches` public API;
- `eventStreamResponse` public API;
- `heartbeatStream`;
- `withHeartbeat`;
- `sseComment`.

Keep any necessary helpers internal to implement `live.query` and `reply.stream({ heartbeat })`.

## Example policy

Examples should intentionally show app-owned Effect resources:

```ts
const updates = yield* PubSub.sliding<void>(16)
yield* PubSub.publish(updates, undefined)

return reply.stream(
  live.query({
    invalidations: Stream.fromPubSub(updates),
    load,
    render
  })
)
```

Tiny local example helpers are acceptable if they improve readability, but they should not become exported framework helpers.

## Implementation work

- Add `src/live.ts` with `query(...)`.
- Export lowercase `live` from the package root.
- Remove public `Model` and `Realtime` namespaces from app-facing exports.
- Delete or internalize old realtime helper modules/functions.
- Move heartbeat support into `reply.stream` options.
- Rewrite live counter example to use Effect `PubSub`/`Stream` directly.
- Replace `commandDone()` with `reply.done()`.
- Replace `liveQueryResponse(...)` with `reply.stream(live.query(...))`.
- Remove tests that only protect generic realtime helpers.
- Add focused tests for:
  - render-on-connect;
  - invalidation-triggered rerender;
  - reconnect renders current state;
  - heartbeat comments through `reply.stream`;
  - absence of public `Realtime`/`Model` realtime helpers.

## Acceptance criteria

- There is one obvious realtime story: app invalidation stream -> `live.query` -> `reply.stream`.
- `live.query` always renders current backend state on connect.
- Reconnect safety is documented and tested.
- App-owned resources are shown with Effect `PubSub`/`Stream`, not ts-star wrappers.
- Generic value-stream-to-DOM-patch helpers are not public.
- Heartbeat is available without exposing a realtime toolbox.
- Public API no longer suggests event-delta-first UI state.

## Anti-goals

- Do not add broker abstraction layers.
- Do not add websocket sync concepts.
- Do not create per-client authoritative UI state.
- Do not keep old `Model`/`Realtime` compatibility surfaces.
- Do not make `live.query` a generic SSE event generator.
- Do not add built-in error mapping, retry policy, or validation signal conventions.
