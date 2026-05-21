# Programming model

Datastar Kit works best when the server owns the application truth and the browser stays light. Datastar gives the browser a small runtime for events, requests, signals, and DOM/signal patches; Datastar Kit gives your TypeScript handlers a pleasant way to speak that protocol.

Keep the model simple:

- backend resources are authoritative;
- browser signals are sparse input and local UI feedback;
- server-rendered HTML is the usual patch payload;
- SSE is the normal patch transport;
- client-side code should stay small enough to understand in one sitting.

## CQRS-shaped flow

Most applications end up with a CQRS-shaped rhythm:

- **Pages** render the first view from current backend state.
- **Commands** receive user intent, validate input, mutate backend resources, and return `204` or local feedback patches.
- **Queries and live views** read current backend state and patch the UI.
- **Invalidations** say "something changed"; live views can reload current state when they receive one.

The core invariant is:

> A client can recover by reconnecting and rendering current backend state.

## Request flow

1. A page renders initial HTML from backend state or renders a shell that opens a query/live stream.
2. A browser event invokes a Datastar action URL such as `@post('/todos/add')`.
3. A command decodes signals/form/query input at the request boundary, optionally validates it, mutates backend state, and publishes an app-owned invalidation if a current-state view should rerender.
4. The command returns `reply.done()` or a patch response.
5. A query/live recipe renders current backend state and returns a Datastar element patch.

## Commands

For command handlers:

- Decode Datastar signal input with `read.signals(request)`; validate with `read.signals(request, schema)` when the handler needs schema guarantees.
- Use Web APIs or your framework directly for ordinary query params, form posts, files, JSON APIs, and framework-specific context.
- Check auth, ownership, CSRF, and rate limits before mutating.
- Return `reply.done()` by default when no immediate UI feedback is needed.
- Return `200` patches for recoverable validation or domain errors that the user should see in the current view.

## Action URLs and routing

Datastar Kit helps you generate action expressions such as `ds.post('/increment')` or `ds.get(ds.queryUrl('/search', { q }))`. Your framework still owns route registration.

Suggested route names:

- `POST /todos/add` — command;
- `POST /todos/:id/toggle` — command;
- `GET /todos/list` — query patch;
- `GET /todos/live` — live stream recipe.

Next: [Runtime boundaries](runtime-boundaries.md). Related: [Actions and responses](../guides/actions-and-responses.md), [Realtime streams](../guides/realtime.md).
