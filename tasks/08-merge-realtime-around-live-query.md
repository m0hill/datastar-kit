# T008 — Merge realtime around current-state live queries

## Status

`pending`

## Grill level

`4/5` — major public-shape decision.

## Why this task exists

`src/model.ts`, `src/realtime.ts`, and `src/runtime.ts` all contain realtime concepts. This creates multiple ways to stream UI updates:

- generic PubSub helpers;
- live element response helpers;
- live query helpers;
- runtime live query hub service.

The stated philosophy is current-state live queries: invalidations trigger a fresh load/render, and reconnecting is safe.

## Recommended answer

Make `Model.liveQuery` / `Model.liveQueryResponse` the canonical realtime abstraction. Let applications use Effect `PubSub`/`Stream` directly unless a tiny helper clearly improves local reasoning.

## Keep candidates

- `liveQuery`
- `liveQueryResponse`
- heartbeat support if needed for long-lived SSE
- maybe one small PubSub creation helper if examples become much noisier without it

## Removal/internal candidates

- `RealtimeStream` alias
- `makeBroadcaster` alias
- `liveElementsResponse`
- `liveElementsPubSubResponse`
- `mapToElementPatches` public API
- `LiveQueryHub` service from `Runtime`
- complex coalescing options until real use proves them
- `LiveQuery` object alias if direct functions are enough

## Implementation work

- Merge any retained heartbeat/event-stream code into the canonical model/platform layer.
- Remove generic live element streaming helpers from public API.
- Rewrite live counter example to show invalidation -> load current state -> render patch.
- Ensure reconnect semantics remain documented and tested.

## Acceptance criteria

- There is one obvious realtime story.
- The story matches Datastar CQRS guidance.
- Generic value-stream-to-DOM-patch helpers are not public unless clearly justified.
- Realtime examples do not suggest event-delta-first UI state.

## Anti-goals

- Do not add broker abstraction layers.
- Do not add websocket sync concepts.
- Do not create per-client authoritative UI state.
