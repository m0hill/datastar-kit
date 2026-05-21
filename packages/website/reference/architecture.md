# Architecture

Datastar Kit is a Web Standards Datastar SDK for server-driven TypeScript UI. It focuses on Datastar authoring, server-rendered HTML, signal decoding, SSE event chunks, and native `Response` helpers.

## Architecture stance

The SDK makes Datastar pleasant from fetch-compatible handlers. Core APIs use standard primitives such as `Request`, `Response`, `Headers`, `URL`, and `ReadableStream`.

## Foundational decisions

- **Backend state is the source of truth.** Browser signals are sparse request inputs and UI affordances.
- **Datastar is the browser runtime and patch protocol.** Datastar Kit generates Datastar-compatible attributes, direct responses, and SSE events.
- **Fetch-compatible composition.** The helpers fit inside Hono, custom fetch handlers, Workers, Bun, Deno, Node, and similar hosts.
- **HTML is generated on the server.** View code uses the automatic JSX runtime over a tiny HTML node model; external renderer output can cross the trust boundary with `unsafeHtml(renderedHtml)`.
- **SSE patches are the default response style.** Direct responses remain available for integrations that need Datastar direct-response handling.
- **Signals are mostly ephemeral.** Use them for form/input state, validation feedback, loading flags, and request parameters.

## Source layers

### Protocol layer

- `src/sse.ts` encodes low-level Datastar SSE events.
- `src/event.ts` renders HTML nodes into Datastar SSE event chunks for streams.
- `src/reply.ts` turns events and rendered HTML into native `Response` objects.

### View layer

- `src/html.ts` exposes `h`, `mergeProps`, `renderToString`, and `unsafeHtml` as the low-level node model.
- `src/jsx-runtime.ts` and `src/jsx-dev-runtime.ts` provide the automatic JSX runtime for `jsxImportSource: "datastar-kit"`.
- `src/jsx.ts` is the internal JSX node adapter used by the automatic runtime.
- `src/ds/index.ts` is the public `ds` barrel; sibling files in `src/ds/` group expressions, actions, attributes, modifiers, and signal references by concern.

### Request boundary layer

- `src/read.ts` decodes JSON object Datastar signal payloads from an explicit `Request` and optionally validates them with Standard Schema.
- Generic query params, forms, multipart bodies, JSON APIs, and auth/session inputs use the host platform's Web APIs or framework utilities.

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

Related: [API reference](api.md), [Runtime boundaries](../concepts/runtime-boundaries.md).
