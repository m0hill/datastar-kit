# T006 — Shrink Datastar helpers and stop expression DSL creep

## Status

`pending`

## Grill level

`4/5` — major public-shape decision.

## Why this task exists

`src/datastar.ts` is useful, but it is also where `ts-star` is most likely to grow a frontend mini-language. Helpers like `and`, `or`, `ternary`, `Signal.add`, and `Signal.toggle` invite framework-specific expression authoring instead of simple Datastar expressions.

The framework should mirror Datastar, not wrap it in a new client framework.

## Recommended answer

Keep thin helpers for common Datastar attributes/actions. For complex client expressions, prefer explicit Datastar/JavaScript strings via `raw(...)`.

## Keep candidates

- `on`
- `init`
- `text`
- `show`
- `bind`
- `dataSignals`
- `dataSignal`
- `get`, `post`, `put`, `patch`, `del`
- `queryUrl`
- `signal`
- `raw`
- `mergeAttrs` if still needed by examples

## Removal/internal candidates

- `Signal.set`, `Signal.eq`, `Signal.neq`, `Signal.add`, `Signal.toggle`
- `not`, `and`, `or`, `ternary`, `fn`
- `inputSignal`
- either `privateSignal` or `localSignal` alias
- `bindValue`, `refValue`, `indicatorValue`
- validation/loading signal helpers if validation/loading moves to recipes
- exported modifier builders unless users need to compose modifier strings manually

## Implementation work

- Decide the canonical helper set.
- Delete aliases and unused generic combinators.
- Keep Datastar option coverage where it mirrors documented Datastar behavior.
- Update tests to focus on public helper behavior, not every internal modifier function.
- Update docs to show explicit expressions when complexity rises.

## Acceptance criteria

- `Datastar` feels like a thin convenience layer, not a framework language.
- There is one canonical helper per concept.
- Local/private signal naming is clear and matches Datastar philosophy.
- Complex client-side expression building is not encouraged.

## Anti-goals

- Do not chase full typed coverage of every JavaScript expression.
- Do not add React/Solid-like reactive state helpers.
- Do not keep aliases because they are convenient.
