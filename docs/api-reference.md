# API reference map

This is a map to the current source modules and concept docs.

## Protocol and Datastar

- `ts-star/sse` — explicit subpath for low-level event encoding (`patchElements`, `patchSignals`, `executeScript`, stream concatenation).
- `ds` — thin Datastar mirrors for actions, attributes, signal refs, and expression escape hatches.
- `read` — request-boundary Datastar signal decoding from native `Request` values.
- `reply` — Datastar-safe native `Response` helpers. SSE patch helpers are the default path; flat `reply.direct*` helpers are explicit direct-response escape hatches.

Docs: `datastar-philosophy.md`, `datastar-protocol.md`, `signals.md`.

## HTML and views

Top-level HTML helpers are the canonical server-rendering API:

- `h`
- `render`
- `fragment`
- `raw`
- `props`
- `page`

JSX is an explicit experimental adapter from `ts-star/jsx`, not a root API.

Docs: `html-rendering.md`.

## Validation and realtime recipes

- `read.signals(request, schema)` validates Datastar signal payloads with Standard Schema.
- Live/current-state updates are app-owned recipes built from invalidation sources and `reply.stream(...)`.

Docs: `programming-model.md`, `actions-commands.md`, `live-queries.md`, `errors-validation.md`.

## Cross-cutting guidance

- Auth, sessions, CSRF, and request limits are app-owned security boundary concerns, not public SDK modules.
- Safe Datastar-driven navigation is handled by `reply.navigate(...)`.
- Observability should use your platform tools directly.

Docs: `runtime.md`, `security.md`, `observability-testing.md`, `public-api.md`.
