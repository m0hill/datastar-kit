# T002 — Curate root exports and create a real internal boundary

## Status

`pending`

## Grill level

`3/5` — design cleanup with a recommended answer.

## Why this task exists

`src/index.ts` currently exports every module as a namespace and then re-exports every named helper. This makes prototype helpers public by accident and encourages users/examples to grab anything from the root.

A greenfield framework should not have a public API surface by accident.

## Recommended answer

Prefer namespace imports from a small blessed set:

```ts
import { Datastar, Html, Model, Platform, Sse } from "ts-star"
```

Remove root-level named re-exports. Promote other modules only after a concrete use case proves they belong in core.

## Implementation work

- Replace `export * from "./..."` root re-exports with curated namespace exports.
- Decide which namespaces remain public after T001.
- Move implementation-only code under `src/internal/**` or leave it unexported.
- Update examples/tests/docs to use the blessed import style.
- Rewrite `test/index-exports.test.ts` to enforce a small public surface.

## Likely public namespaces

- `Sse`
- `Html`
- `Datastar`
- `Platform`
- `Model`
- maybe narrowed `Contracts`

`Client` is not public after T011; runtime script inclusion is explicit HTML.

## Likely non-public namespaces

- `Runtime`
- `Realtime` after merging/shrinking
- `Security`
- `Validation`
- `Observability`
- `Jsx` unless explicitly experimental and separate

## Acceptance criteria

- Accidental root-level named exports are gone.
- Tests prove removed modules/helpers are no longer root-public.
- Examples still demonstrate a clean path.
- Public API docs match the actual exports.

## Anti-goals

- Do not keep named re-exports for convenience.
- Do not keep old and new import styles in docs.
- Do not add compatibility aliases.
