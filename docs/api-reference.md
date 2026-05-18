# API reference map

This is a map to the current source modules and concept docs.

## Protocol and Datastar

- `Sse` — low-level event encoding (`patchElements`, `patchSignals`, `executeScript`, stream concatenation).
- `ds` — thin Datastar mirrors for actions, attributes, signal refs, and expression escape hatches.
- `read` — request-boundary signal/query decoding helpers.
- `reply` — Datastar-safe response helpers. SSE patch helpers are the blessed path; `reply.direct.*` is the direct-response escape hatch.

Docs: `datastar-philosophy.md`, `datastar-protocol.md`, `signals.md`.

## HTML and views

Top-level HTML helpers are the canonical server-rendering API:

- `h`
- `render`
- `fragment`
- `raw`
- `props`
- `page`

JSX is an explicit experimental adapter from `src/jsx.ts`, not a root API.

- `Client` — Datastar script/document/client asset helpers.

Docs: `html-rendering.md`.

## Contracts and live queries

- `contract` — schema-derived signal handles, initial props, and typed patches.
- `live` — current-state live queries that emit Datastar element patch events and compose with `reply.stream`.

Docs: `type-contracts.md`, `programming-model.md`, `actions-commands.md`, `live-queries.md`.

## Still under cleanup

- `Security`, `Validation`, and `Observability` still exist in source while the simplification roadmap decides whether they stay public.

Docs: `runtime.md`, `security.md`, `errors-validation.md`, `observability-testing.md`, `public-api.md`.

## Examples

See `docs/examples.md` for the tested reference examples and package scripts.
