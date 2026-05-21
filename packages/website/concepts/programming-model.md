# Programming model

Datastar Kit is for server-driven UI where backend state is authoritative. Datastar gives the browser a small runtime for events, requests, signals, and DOM/signal patches.

Keep the mental model simple:

- backend state is authoritative;
- browser signals are sparse request input and UI feedback state;
- server-rendered HTML is the patch payload;
- SSE is the primary streaming transport;
- client-side complexity should stay minimal.

## CQRS-shaped flow

The default shape is close to CQRS:

- **Pages / query views** render current backend state.
- **Commands** receive user intent, validate input, mutate backend state, and return `204` or local feedback patches.
- **Queries / live recipes** read current backend state and patch the view.
- **Invalidations** say “something changed”; query and live views can reload current backend state after receiving them.

The core invariant is:

> A client can recover by reconnecting and rendering current backend state.

## Request flow

1. A page renders initial HTML from backend state or renders a shell that opens a query/live stream.
2. A browser event invokes a Datastar action URL such as `@post('/todos/add')`.
3. A command decodes signals/form/query input at the request boundary, optionally validates it, mutates backend state, and publishes an app-owned invalidation if a current-state view should rerender.
4. The command returns `reply.done()` or a patch response.
5. A query/live recipe renders current backend state and returns a Datastar element patch.

## Commands

Guidelines:

- Decode Datastar signal input with `read.signals(request)`; validate with `read.signals(request, schema)` when the handler needs schema guarantees.
- Use Web APIs or your application framework directly for other request inputs.
- Mutate backend state inside the command.
- Return `reply.done()` by default when no immediate UI feedback is needed.
- Return `200` patches for recoverable validation or domain errors that the user should see in the current view.

## Action URLs and routing

Examples export framework or fetch-compatible handlers and generate action URLs with helpers such as `ds.post('/increment')` or `ds.get(ds.queryUrl('/search', { q }))`. Your framework owns route registration.

Suggested route names:

- `POST /todos/add` — command;
- `POST /todos/:id/toggle` — command;
- `GET /todos/list` — query patch;
- `GET /todos/live` — live stream recipe.

Next: [Runtime boundaries](runtime-boundaries.md). Related: [Actions and responses](../guides/actions-and-responses.md), [Realtime streams](../guides/realtime.md).
