# `data-on-signal-patch` Attribute Report

## Status

PASS — `datastar-kit` renders documented `data-on-signal-patch` expressions and timing modifiers correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-on-signal-patch/data-on-signal-patch.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`
- Upstream Datastar `library/src/plugins/attributes/onSignalPatch.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Signal patch expression form | `data-on-signal-patch="console.log(...)"` with `h()` and JSX |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Signal refs / `js` helpers | Template expressions render as Datastar expression source |
| `patch` argument | Expressions containing `patch` are preserved |
| `el` expression variable | Expressions containing `el` are preserved |
| Primitive expression values | `true`, `false`, and `0` render as expression strings instead of being omitted |
| Delay modifier | `__delay.500ms` |
| Debounce modifier | `__debounce.1s.leading.notrailing` |
| Throttle modifier | `__throttle.250ms.noleading.trailing` |
| Normal Datastar markup style | Hand-written `data-on-signal-patch__debounce.500ms` renders unchanged through JSX spread props |
| Companion filter attribute | `data-on-signal-patch-filter` renders together with `data-on-signal-patch` |
| Attribute evaluation order | Authored `data-signals`, `data-on-signal-patch`, and `data-text` order is preserved |
| Invalid SDK modifiers | Unsupported `viewTransition` modifier is rejected |

## Test File

- `packages/datastar-kit/test/attributes/data-on-signal-patch/data-on-signal-patch.test.tsx`

## Findings

- `data-on-signal-patch` is correctly treated as an expression-valued Datastar attribute.
- The `patch` callback argument is preserved in authored expressions.
- Documented timing modifiers are supported through `mod()`.
- Hand-written Datastar modifier syntax remains supported through normal JSX/spread props.

## Issues / Fixes

None.

## Considerations

- Use the separate `data-on-signal-patch-filter` attribute to filter signal patches; it has its own dedicated test/report.
- `data-on-signal-patch` supports timing modifiers, but not `viewtransition` in upstream Datastar.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-on-signal-patch/data-on-signal-patch.test.tsx`
- `pnpm --filter datastar-kit typecheck`
