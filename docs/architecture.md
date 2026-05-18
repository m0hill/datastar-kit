# ts-star architecture baseline

`ts-star` is a layered server-driven UI package: it keeps low-level Datastar SDK pieces available, while building toward a framework programming model on top of Effect.

This document is the baseline for future roadmap work. New APIs should fit one of these layers instead of accumulating as unrelated helpers.

## Architecture stance

`ts-star` is not only a Datastar protocol SDK and not yet a complete application framework. It is a layered package with two public faces:

1. **Low-level SDK surface** for Datastar events, attributes, Datastar signal decoding, HTML rendering, and response construction.
2. **Framework surface** that should guide applications toward backend-source-of-truth pages, actions, and live queries.

The low-level surface remains available for escape hatches and small apps. The framework surface is where request decoding, response semantics, and realtime semantics should converge without taking over app-owned security or observability policy.

## Foundational decisions

These are baseline decisions for the rest of the roadmap:

- **Backend state is the source of truth.** Browser signals are sparse request inputs and UI affordances, not the primary application store.
- **Datastar is the browser runtime and patch protocol.** `ts-star` should generate Datastar-compatible attributes, direct responses, and SSE events rather than wrapping Datastar in a separate client framework.
- **Effect owns app runtime concerns.** Dependencies, typed errors, resource scopes, concurrency, streams, and realtime resources should be modeled with app-owned Effect services/layers rather than a ts-star runtime service catalog.
- **HTML is generated on the server.** The current builder and JSX factory are intentionally small; the renderer boundary must remain open for adapters.
- **Datastar direct responses and SSE streams are first-class.** Commands can return `204`, direct HTML/JSON/script responses, or SSE patch streams depending on browser runtime semantics.
- **Signals are mostly ephemeral.** They should support form/input state, validation feedback, loading/indicator flags, and request parameters without becoming hidden client-side app state.

## Flexible decisions

These remain open until later tasks provide stronger evidence:

- The exact route/action/page DSL.
- Whether hyperscript, JSX, or external renderer adapters are the primary authoring style.
- The exact shape of a `Page` abstraction.
- The realtime backend implementation behind live queries.
- How expressive the Datastar expression DSL should become.
- The final public/internal module split once runtime services and framework APIs exist.

## Layer model

### 1. Protocol layer

Owns the Datastar wire format and direct response semantics.

Current files:

- `src/sse.ts` encodes Datastar SSE events: element patches, signal patches, signal removal, script execution, and event stream concatenation.
- `src/reply.ts` turns those events into Datastar-aware HTTP responses and direct-response escape hatches.

Future work in this layer should be driven by runtime-backed Datastar behavior, not guessed protocol interpretations.

### 2. View layer

Owns server-rendered HTML and Datastar attributes.

Current files:

- `src/html.ts` is the minimal top-level HTML boundary: `h`, `render`, `fragment`, `raw`, `props`, and `page`.
- `src/jsx.ts` is an experimental adapter over the same HTML nodes, imported explicitly rather than through the package root.
- `src/contract.ts` derives signal handles, initial props, and typed patches from Effect Schema contracts.
- `src/ds.ts` exposes thin Datastar mirrors for expressions, fetch actions, signal references, modifiers, and `data-*` attributes; implementation-only helpers stay non-exported in that module.

Datastar runtime inclusion is explicit HTML in the page head. `ts-star` does not inject scripts, ship a public client asset helper, or serve `/datastar.js`.

External renderers can pass trusted rendered strings through `raw(renderedHtml)` at response boundaries. A public renderer adapter interface should wait for real adapter pressure.

### 3. Runtime layer

Owns Effect-native request handling, decoding, responses, streaming, and resource composition. Security/session policy remains app-owned.

Current files:

- `src/read.ts` provides concise request-boundary Datastar signal decoding. It internally handles Datastar's GET/DELETE query-param signal transport and body JSON transport.
- Apps use Effect Platform directly for routing, query params, forms, multipart bodies, and non-Datastar HTTP inputs.
- `src/reply.ts` provides Datastar-safe page, patch, stream, direct-response, and no-content helpers.

Future runtime work should introduce framework services only when they simplify lifecycle, typed error handling, cancellation, or shared dependencies enough to justify the added surface area.

### 4. Programming model layer

This is the intended framework surface and now exists as small primitives rather than a broad model namespace.

Applications should start from:

1. **Pages/queries** that render current backend state.
2. **Actions/commands** that decode trusted request inputs, mutate backend state, and return `204` or Datastar patches/direct responses for local feedback.
3. **Live queries** that stream current rendered state on connect and after invalidation, making reconnects safe.

The current helpers (`reply.done`, `reply.patch`, `reply.stream`, and `live.query`) define the semantics while leaving a higher-level `Page`/route DSL flexible.

## Public module boundary proposal

The public boundary is being simplified before release. The current app-facing direction is:

- `ds` for Datastar browser-facing primitives.
- `read` for Datastar signal decoding.
- `reply` for Datastar-safe responses.
- `contract` for narrow schema-derived signal contracts.
- `live` for current-state live query event streams.
- top-level `h`, `render`, `fragment`, `raw`, `props`, and `page` for server HTML.
- `ts-star/sse` as an explicit low-level protocol subpath, not a root export.

JSX is an explicit experimental adapter, not a root API.

Implementation-only code should stay unexported from module files or live under `src/internal/**` only when a real split improves source navigation.

## Naming conventions

- Keep low-level helpers named after the Datastar concept they generate: `patchSignals`, `dataSignals`, `on`, `post`, `indicator`, etc.
- Do not expose `platform*` helpers as app-facing API; use Effect Platform directly for routing and generic HTTP concerns.
- Use short contextual namespaces for app-facing helpers: `ds`, `read`, `reply`, `contract`, and `live`. Keep route DSL names such as `action` reserved until the abstraction exists.
- Prefer explicit names over magic conventions at module boundaries.

## Default request flow

A typical action should flow like this:

1. Server-rendered HTML includes Datastar attributes such as `data-on:click="@post('/increment')"`.
2. The browser runtime sends a Datastar request with sparse signals.
3. An Effect handler decodes Datastar signals with `read.signals(schema)` or uses Effect Platform directly for non-Datastar inputs.
4. The handler reads/mutates backend state.
5. The response is a Datastar-compatible direct response or SSE patch stream.
6. The browser applies the patch; durable state remains on the backend.

## What ts-star intentionally does not do

`ts-star` should not become:

- A virtual DOM runtime.
- A client router.
- A React-style component lifecycle system.
- A complex browser-side store or websocket sync engine.
- A plugin-heavy frontend framework clone.

The project should stay small, explicit, and server-driven.
