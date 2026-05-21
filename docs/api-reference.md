# API reference map

This is a map to the current source modules and concept docs.

## Protocol and Datastar

- `datastar-kit/sse` — explicit subpath for low-level event encoding (`patchElements`, `patchSignals`, `executeScript`).
- `ds` — thin Datastar mirrors for actions, attributes, signal refs, and expression escape hatches.
- `event` — rendered Datastar SSE event chunks (`patch`, `signals`, `script`) for `reply.stream(...)`.
- `read` — request-boundary Datastar signal decoding from native `Request` values.
- `reply` — Datastar-safe native `Response` helpers. SSE patch helpers are the default path; flat `reply.direct*` helpers are explicit direct-response escape hatches.

Docs: `datastar-philosophy.md`, `datastar-protocol.md`, `signals.md`.

## HTML and views

Server-side JSX is the canonical app/view authoring API:

- `datastar-kit/jsx-runtime` / `datastar-kit/jsx-dev-runtime` for TypeScript automatic JSX (`jsxImportSource: "datastar-kit"`).
- top-level `h`, `mergeProps`, `renderToString`, and `unsafeHtml` as the low-level HTML primitive surface.

Docs: `html-rendering.md`.

## Validation and realtime recipes

- `read.signals(request)` parses JSON object signal state; `read.signals(request, schema)` additionally validates with Standard Schema.
- Live/current-state updates are app-owned recipes built from invalidation sources and `reply.stream(...)`.

Docs: `programming-model.md`, `actions-commands.md`, `live-queries.md`, `errors-validation.md`.

## Cross-cutting guidance

- Auth, sessions, CSRF, and request limits are app-owned security boundary concerns, not public SDK modules.
- Safe Datastar-driven navigation is handled by `reply.navigate(...)`.
- Observability should use your platform tools directly.

Docs: `runtime.md`, `security.md`, `observability-testing.md`, `public-api.md`.
