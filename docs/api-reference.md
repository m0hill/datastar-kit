# API reference map

This is a map to the current source modules and concept docs. Prefer namespace imports from the root package.

## Protocol and Datastar

- `Sse` — low-level event encoding (`patchElements`, `patchSignals`, `executeScript`, stream concatenation).
- `Datastar` — expressions, signals, action helpers, modifiers, attributes, signal policy helpers.
- `Platform` — HTTP request decode helpers and Datastar-safe response constructors.

Docs: `datastar-philosophy.md`, `datastar-protocol.md`, `signals.md`.

## Views

- `Html` — HTML node builder, renderer, ordered attrs, raw HTML, patchable IDs.
- `Jsx` — experimental classic JSX factory over `Html` nodes.
- `Client` — Datastar script/document/client asset helpers.

Docs: `html-rendering.md`.

## Contracts and model

- `Contracts` — schema-derived signal handles, initial attributes, decoders, patches, action/query URL helpers.
- `Model` — command completion, current-view patch responses, live-query helpers.

Docs: `type-contracts.md`, `programming-model.md`, `actions-commands.md`, `live-queries.md`.

## Runtime and services

- `Runtime` — Effect services/layers for config, renderer, protocol, request context, signal decoder, error mapper, live query hub.
- `Realtime` — PubSub/Stream utilities, heartbeats, live element patch responses.
- `Security` — CSRF, auth context, request limits, abort access, safe navigation.
- `Validation` — typed validation/domain error UX helpers.
- `Observability` — telemetry service, span helpers, stream observation, in-memory test telemetry.

Docs: `runtime.md`, `security.md`, `errors-validation.md`, `observability-testing.md`, `public-api.md`.

## Examples

See `docs/examples.md` for the tested reference examples and package scripts.
