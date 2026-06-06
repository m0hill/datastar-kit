# `data-on-intersect` Attribute Report

## Status

PASS — `datastar-kit` renders documented `data-on-intersect` expressions and modifiers correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-on-intersect/data-on-intersect.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`
- Upstream Datastar `library/src/plugins/attributes/onIntersect.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Intersect expression form | `data-on-intersect="$intersected = true"` with `h()` and JSX |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Signal refs / `js` helpers | Template expressions render as Datastar expression source |
| `el` expression variable | Authored expressions containing `el` are preserved |
| Primitive expression values | `true`, `false`, and `0` render as expression strings instead of being omitted |
| Visibility modifiers | `__once`, `__exit`, `__half`, `__full`, and `__threshold.*` |
| Delay modifier | `__delay.500ms` |
| Debounce modifier | `__debounce.1s.leading.notrailing` |
| Throttle modifier | `__throttle.250ms.noleading.trailing` |
| View transition modifier | `__viewtransition` |
| Normal Datastar markup style | Hand-written `data-on-intersect__once__full` renders unchanged through JSX spread props |
| Attribute evaluation order | Authored `data-signals`, `data-on-intersect`, and `data-text` order is preserved |
| Invalid SDK modifiers | Unsupported `capture` modifier is rejected |

## Test File

- `packages/datastar-kit/test/attributes/data-on-intersect/data-on-intersect.test.tsx`

## Findings

- `data-on-intersect` is correctly treated as an expression-valued Datastar attribute.
- All documented modifier categories are supported through `mod()`.
- Timing values normalize as expected (`250` -> `250ms`, numeric string -> `ms`, duration string preserved).
- Hand-written Datastar modifier syntax remains supported through normal JSX/spread props.

## Issues / Fixes

None.

## Considerations

- Datastar denies keyed `data-on-intersect:*` at runtime. The SDK renders raw HTML attributes and does not try to reject every invalid handwritten combination.
- Datastar resolves conflicting visibility modifiers at runtime; avoid combining mutually exclusive options such as `full`, `half`, and `threshold` in application markup.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-on-intersect/data-on-intersect.test.tsx`
- `pnpm --filter datastar-kit typecheck`
