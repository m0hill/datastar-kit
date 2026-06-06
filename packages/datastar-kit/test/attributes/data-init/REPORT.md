# `data-init` Attribute Report

## Status

PASS — `datastar-kit` renders documented `data-init` expressions and modifiers correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-init/data-init.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`
- Upstream Datastar `library/src/plugins/attributes/init.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Init expression form | `data-init="$count = 1"` with `h()` and JSX |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Action expressions | `get("/endpoint")` renders as `@get(...)` for `data-init` |
| Signal refs / `js` helpers | Template expressions render as Datastar expression source |
| `el` expression variable | Authored expressions containing `el` are preserved |
| Primitive expression values | `true`, `false`, and `0` render as expression strings instead of being omitted |
| Delay modifier | `__delay`, `__delay.500ms`, and `__delay.1s` render from boolean, number, numeric string, and duration string inputs |
| View transition modifier | `__viewtransition` renders and combines with delay |
| Normal Datastar markup style | Hand-written `data-init__delay.500ms__viewtransition` renders unchanged through JSX spread props |
| Attribute evaluation order | `data-indicator` renders before `data-init` when authored first |
| Invalid SDK modifiers | Unsupported `debounce` modifier is rejected |

## Test File

- `packages/datastar-kit/test/attributes/data-init/data-init.test.tsx`

## Findings

- `data-init` is correctly treated as an expression-valued Datastar attribute.
- Plain string values stay raw, so normal Datastar expressions can be authored directly.
- `delay` and `viewTransition` modifiers are supported through `mod()` and render to Datastar's documented suffix names.
- Hand-written Datastar modifier syntax remains supported through normal JSX/spread props.

## Issues / Fixes

None.

## Considerations

- Datastar denies keyed `data-init:*` at runtime. The SDK renders raw HTML attributes and does not try to reject every invalid handwritten combination.
- Use authored attribute order intentionally when `data-init` depends on another attribute, such as `data-indicator`.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-init/data-init.test.tsx`
- `pnpm --filter datastar-kit typecheck`
