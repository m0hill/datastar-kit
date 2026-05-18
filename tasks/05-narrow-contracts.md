# T005 — Narrow Contracts to typed signal contracts only

## Status

`pending`

## Grill level

`4/5` — major public-shape decision.

## Why this task exists

`defineSignals` contains a useful idea: derive typed signal references, initial attributes, and patch shapes from one schema.

But `src/contracts.ts` currently crosses too many layers. It includes request reading, runtime-service decoding, response construction, action contracts, and query-action contracts. That turns a type helper into a mini route/action DSL before a real routing model exists.

## Recommended answer

Keep contracts narrow:

- schema;
- typed signal refs;
- typed `data-signals` initial attributes;
- typed signal patch shape.

Use `Platform.readSignals(schema)` and canonical response helpers directly in handlers.

## Implementation work

- Simplify `SignalContract` fields.
- Remove `read`, `readFromRequest`, `decode`, and `patchResponse` from signal contracts.
- Remove `defineAction` and `defineQueryAction` unless a concrete route DSL is being implemented now.
- Remove `signalPatchJson` and `signalPatchValue` cast helpers.
- Update examples and tests.
- Update docs to avoid claiming route/action URLs have one source of truth before they actually do.

## Removal candidates

- `defineAction`
- `defineQueryAction`
- `ActionContract`
- `QueryActionContract`
- `SignalContract.decode`
- `SignalContract.patchResponse`
- `signalPatchJson`
- `signalPatchValue`

## Acceptance criteria

- Contracts reduce type drift without owning routing/runtime/response concerns.
- Handler flow remains locally readable.
- No parallel decoding APIs exist for the same request input.
- Tests still prove typed signal refs and patch shapes.

## Anti-goals

- Do not build a route compiler.
- Do not recreate tRPC-style abstractions.
- Do not couple contracts to `Runtime` services.
