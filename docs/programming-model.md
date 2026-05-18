# Backend-state and CQRS programming model

`ts-star` applications should be designed as backend-source-of-truth systems. Datastar gives the browser a small runtime for events, requests, and DOM/signal patches; it should not become the application state store.

The default mental model is CQRS:

- **Pages / query views** render current backend state.
- **Commands** receive user intent, validate input, mutate backend state, and return `204` or local feedback patches.
- **Queries / live recipes** read current backend state and patch the view.
- **Invalidations** say “something changed”; they are not durable state and do not need to carry every UI delta.

The core invariant is:

> A client can recover by reconnecting and rendering current backend state.

## Request flow

1. A page renders initial HTML from backend state or renders a shell that opens a query/live stream.
2. A browser event invokes a Datastar action URL such as `@post('/todos/add')`.
3. A command decodes signals/form/query input at the request boundary, validates it, mutates backend state, and publishes an app-owned invalidation if a current-state view should rerender.
4. The command returns `reply.done()` or a patch response.
5. A query/live recipe renders current backend state and returns a Datastar element patch.

## Commands

Guidelines:

- Decode Datastar signal input with Standard Schema through `read.signals(request, schema)`.
- Use Web APIs or your application framework directly for other request inputs.
- Mutate backend state inside the command.
- Return `reply.done()` by default when no immediate UI feedback is needed.
- Return `200` patches for recoverable validation or domain errors that the user should see in the current view.

## Action URLs and routing

Examples export plain fetch-compatible handlers and generate action URLs with helpers such as `ds.post('/increment')` or `ds.get(ds.queryUrl('/search', { q }))`. Your framework owns route registration.

Suggested names:

- `POST /todos/add` — command
- `POST /todos/:id/toggle` — command
- `GET /todos/list` — query patch
- `GET /todos/live` — live stream recipe
