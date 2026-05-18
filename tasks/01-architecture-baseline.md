# T001 — Define the framework architecture baseline

## Status

`pending`

## Why this task exists

`ts-star` currently has strong low-level pieces, but it does not yet have a stable framework shape. The source tree is essentially:

- Datastar SSE encoding
- Datastar attribute/action/expression helpers
- a tiny HTML/JSX renderer
- Effect Platform response helpers
- optional PubSub/Stream realtime helpers

That can become a framework, but only if the project explicitly decides what sits above those primitives. Without this decision, future work will likely expand helper APIs randomly and produce an SDK rather than a coherent programming model.

The current `README.md` also describes modules that no longer exist, so even the documented architecture is out of sync with the implementation.

## Target outcome

Produce a short but authoritative architecture baseline that answers:

1. Is `ts-star` a framework, a Datastar SDK, or a layered package with both?
2. What is the intended programming model?
3. Which modules are public API vs internal implementation?
4. Which decisions are foundational and which remain flexible?
5. What should application authors reach for first?

## Recommended architecture stance

Use a layered model:

1. **Protocol layer** — Datastar SSE events, response helpers, signal decoding.
2. **View layer** — HTML rendering abstraction, Datastar attributes, script/client helpers.
3. **Runtime layer** — Effect services/layers for request lifecycle, errors, realtime, state, security.
4. **Programming model layer** — pages/routes/actions/live queries that embody backend-source-of-truth.

The low-level modules should remain available, but the framework should guide users toward the programming model layer.

## Implementation work

- Rewrite `README.md` so it matches actual files in `src/`.
- Add `docs/architecture.md` or equivalent.
- Define module categories:
  - stable public API
  - experimental public API
  - internal/private API
- Decide naming conventions before more APIs are added.
- Document the default flow from browser event to Effect handler to Datastar patch.
- Document what `ts-star` intentionally does **not** do: virtual DOM, client router, React-style component lifecycle, complex frontend store, websocket sync engine.

## Foundational decisions to record

- Backend is the source of truth.
- Datastar is the browser runtime and patch protocol, not a client app framework to wrap heavily.
- SSE/direct Datastar responses are first-class.
- Effect owns lifecycle, resources, typed errors, dependencies, concurrency, and streams.
- Signals are sparse and mostly ephemeral.
- HTML is generated on the server; templating mechanism remains pluggable.

## Flexible decisions to keep open

- Hyperscript vs JSX vs external template adapters.
- Exact router DSL.
- Exact shape of a `Page` abstraction.
- Realtime backend implementation.
- How rich the expression DSL should become.

## Acceptance criteria

- `README.md` accurately describes current source files.
- Architecture document explains the intended framework model in concrete terms.
- Public vs internal modules are named.
- Future tasks can point to the architecture baseline when deciding tradeoffs.
- No new framework abstraction is introduced until this baseline exists.

## Anti-goals

- Do not create an enterprise architecture document.
- Do not introduce plugin systems yet.
- Do not lock in JSX or the tiny HTML builder as the only renderer.
