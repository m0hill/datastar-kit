# Datastar Kit architecture baseline

Datastar Kit is a Web Standards Datastar SDK for server-driven TypeScript UI. It is not an application framework: application code supplies routing, middleware, auth, deployment, dependency ownership, and lifecycle.

## Architecture stance

The SDK has one public job: make Datastar pleasant from fetch-compatible handlers. Core APIs use standard primitives such as `Request`, `Response`, `Headers`, `URL`, and `ReadableStream`.

## Foundational decisions

- **Backend state is the source of truth.** Browser signals are sparse request inputs and UI affordances, not the primary application store.
- **Datastar is the browser runtime and patch protocol.** Datastar Kit generates Datastar-compatible attributes, direct responses, and SSE events.
- **Application frameworks own runtime concerns.** Routing, middleware, dependencies, cancellation policy, sessions, auth, and deployment belong to Hono, a custom fetch handler, Workers, Bun, Deno, Node, or another host.
- **HTML is generated on the server.** Blessed view code uses the automatic JSX runtime over a tiny HTML node model; external renderer output can cross the trust boundary with `unsafeHtml(renderedHtml)`.
- **Datastar direct responses and SSE streams are first-class.** The blessed path is SSE patches; direct responses remain flat explicit escape hatches.
- **Signals are mostly ephemeral.** Use them for form/input state, validation feedback, loading flags, and request parameters without turning them into hidden app state.

## Layer model

### 1. Protocol layer

- `src/sse.ts` encodes low-level Datastar SSE events.
- `src/event.ts` renders HTML nodes into Datastar SSE event chunks for streams.
- `src/reply.ts` turns events and rendered HTML into native `Response` objects.

### 2. View layer

- `src/html.ts` exposes `h`, `mergeProps`, `renderToString`, and `unsafeHtml` as the low-level node model.
- `src/jsx-runtime.ts` and `src/jsx-dev-runtime.ts` provide the blessed automatic JSX runtime for `jsxImportSource: "datastar-kit"`.
- `src/jsx.ts` is the internal JSX node adapter used by the automatic runtime.
- `src/ds.ts` exposes Datastar expressions, fetch actions, signal references, modifiers, and attributes.

### 3. Request boundary layer

- `src/read.ts` decodes JSON object Datastar signal payloads from an explicit `Request` and optionally validates them with Standard Schema.
- Generic query params, forms, multipart bodies, JSON APIs, and auth/session inputs remain app-owned Web API concerns.

### 4. Programming model layer

The SDK supports a backend-source-of-truth model:

1. Pages render current backend state.
2. Commands decode sparse Datastar signal input, mutate backend state, and return `reply.done()` or a patch.
3. Query handlers render current state and return element/signal patches.
4. Live views are recipes built from app-owned invalidation sources and `reply.stream(...)`.

## Public module boundary

Root exports:

- `ds`
- `event`
- `read`
- `reply`
- `h`, `mergeProps`, `renderToString`, `unsafeHtml`

Explicit subpaths:

- `datastar-kit/sse`
- `datastar-kit/jsx-runtime` / `datastar-kit/jsx-dev-runtime`

Core does not export `contract`, `live`, router, middleware, platform adapter, PubSub, or runtime services.
