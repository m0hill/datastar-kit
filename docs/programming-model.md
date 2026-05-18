# Backend-state and CQRS programming model

`ts-star` applications should be designed as backend-source-of-truth systems. Datastar gives the browser a small runtime for events, requests, and DOM/signal patches; it should not become the application state store.

The default mental model is CQRS:

- **Pages / query views** render current backend state.
- **Commands** receive user intent, validate input, mutate backend state, and return `204` or local feedback patches.
- **Queries / live queries** read current backend state and patch the view.
- **Invalidations** say “something changed”; they are not the durable state and do not need to carry every UI delta.

The core invariant is:

> A client can recover by reconnecting and rendering current backend state.

## Where state lives

Application state lives in backend resources: databases, services, in-memory examples, durable queues, etc. Framework helpers may hold request/connection resources, but they should not hold authoritative UI state per browser connection.

Browser signals are request inputs and UI affordances. Use them for small, sparse values such as a search query, selected ID, validation feedback, or loading flag. Do not mirror whole backend resources into signals and mutate them as a client store.

## Request flow

1. A **page** renders the initial HTML from backend state or renders a shell that immediately opens a query/live query.
2. A browser event invokes a Datastar action URL such as `@post('/todos/add')`.
3. A **command** decodes signals/form/query input at the request boundary, validates it, mutates backend state, and publishes an invalidation if a current-state view should rerender.
4. The command returns:
   - `reply.done()` for successful mutations with no local feedback; or
   - `reply.patch(...)`, `reply.signals(...)`, `reply.stream(...)`, or an explicit `reply.direct.*` response for visible feedback.
5. A **query** or **live query** renders current backend state and returns a Datastar element patch.
6. The browser applies the patch. Durable state remains on the backend.

## Commands

Commands represent intent: add todo, toggle item, save profile, upload avatar.

Guidelines:

- Decode untrusted request input with Effect Schema through `read.*` helpers.
- Mutate backend state inside the command.
- Publish invalidations after successful mutations when live/current views should refresh.
- Return `reply.done()` by default when no immediate UI feedback is needed.
- Return `200` patches for recoverable validation or domain errors that the user should see in the current view.
- Do not make commands responsible for streaming every UI delta to every connected client.

## Queries and render handlers

Queries read current state and render HTML. When a handler already has current state and needs to patch an element, render the node and return `reply.patch(...)` directly.

Prefer fat/main morphs when that keeps the model simpler. Targeted patches are still useful for isolated validation messages, local controls, and large pages where one region clearly owns the query result.

## Live queries

Live queries are current-state streams:

- Render once when the connection opens.
- Subscribe to app-owned invalidation streams.
- On each invalidation, reload current backend state and render again.
- Return the stream with `reply.stream(...)`.

```ts
return reply.stream(
  live.query({
    invalidations,
    load,
    render,
    patch: { selector: "#todos", mode: "outer" }
  })
)
```

Invalidation payloads are ignored by `live.query`; they are just triggers. If a client disconnects and misses invalidations, reconnecting still renders current state.

## Action URLs and routing

Today, examples route commands and queries explicitly with Effect Platform `HttpRouter.route` and generate action URLs with Datastar helpers such as `ds.post('/increment')` or `ds.get(ds.queryUrl('/search', { q }))`.

A future `Page` abstraction may generate route/action URLs from one source of truth. Until that exists, keep routes close to the view that references them and choose names that reveal intent:

- `POST /todos/add` — command
- `POST /todos/:id/toggle` — command
- `GET /todos/list` — query patch
- `GET /todos/live` — live query

## Initial render policy

Both forms are valid:

- **Full page render** when current state is cheap to load and should be visible immediately.
- **Shell + `data-init` query/live query** when the page should open a stream or when the same current-state render path should be used for initial load and refreshes.

The live-query pattern always renders current state on connect, so reconnects are safe.

## Minimal API surface for this model

- `reply.done()` — command success with no body.
- `reply.patch(...)` — server-rendered element patch.
- `reply.signals(...)` — signal patch.
- `reply.stream(...)` — multi-event or long-lived SSE response.
- `live.query(...)` — current-state live query event stream.

## Example

`examples/live-counter.ts` demonstrates the model:

- `count` is backend state in the example process.
- `POST /increment` is a command that mutates `count`, publishes a void invalidation, and returns `204`.
- `GET /live` is a live query that renders `countFragment(currentCount)` on connect and after invalidations.
- A reconnect does not need missed deltas; it renders the current count.

Production apps should replace the in-memory `count` with durable services while keeping the same command/query/live-query split.
