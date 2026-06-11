# Architecture

This page is for contributors and maintainers. It explains the source layout and the boundaries that keep Datastar Kit small.

## Design constraints

- Public APIs stay close to Web Standard primitives: `Request`, `Response`, `Headers`, `URL`, and `ReadableStream`.
- Datastar remains the browser runtime and patch protocol. The SDK serializes typed values for native Datastar attributes and generates actions, SSE events, and direct responses.
- Server-rendered HTML is the primary UI payload. TSX compiles to Datastar Kit's small HTML node model.
- SSE patches are the default Datastar response style. Direct responses exist for integrations that need them.
- Signals are browser-side input and feedback, not the durable state model for an application.
- Framework concerns stay outside the package.

## Source layers

### Datastar protocol

- `src/sse.ts` encodes low-level Datastar SSE events and comments.
- `src/event.ts` renders HTML nodes into Datastar SSE chunks for streams.
- `src/reply.ts` turns rendered HTML and SSE chunks into native `Response` objects.
- `src/navigation.ts` builds safe navigation scripts used by navigation helpers.

### HTML and JSX

- `src/html.ts` defines the internal HTML node model plus `renderToString` and `unsafeHtml`.
- `src/jsx-runtime.ts` and `src/jsx-dev-runtime.ts` provide automatic JSX runtime entrypoints.
- `src/jsx.ts` adapts JSX calls into the HTML node model.

### Datastar authoring

- `src/ds/index.ts` is the internal barrel re-exported by the root package.
- `src/ds/actions.ts` builds Datastar action expressions.
- `src/ds/expression.ts` serializes Datastar expressions.
- `src/ds/signals.ts` defines signal refs and name validation.
- `src/ds/state.ts` builds typed helpers around grouped signal defaults.

### Request boundary

- `src/read.ts` decodes Datastar signal payloads from native `Request` values.
- Generic query params, form posts, multipart uploads, JSON APIs, auth, and request context remain platform or framework concerns.

## Public boundary

Root exports:

- Datastar authoring helpers such as `get`, `post`, `js`, `mod`, `signal`, and `state`
- `event`
- `read`
- `reply`
- `renderToString`, `unsafeHtml`

Explicit subpaths:

- `datastar-kit/sse`
- `datastar-kit/jsx-runtime`
- `datastar-kit/jsx-dev-runtime`

Related: [API reference](api.md), [Runtime boundaries](../concepts/runtime-boundaries.md).
