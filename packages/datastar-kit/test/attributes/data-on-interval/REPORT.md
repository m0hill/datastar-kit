# `data-on-interval` Attribute Report

## Status

PASS — `datastar-kit` renders documented `data-on-interval` expressions and modifiers correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-on-interval/data-on-interval.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`
- Upstream Datastar `library/src/plugins/attributes/onInterval.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Interval expression form | `data-on-interval="$count++"` with `h()` and JSX |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Signal refs / `js` helpers | Template expressions render as Datastar expression source |
| `el` expression variable | Authored expressions containing `el` are preserved |
| Primitive expression values | `true`, `false`, and `0` render as expression strings instead of being omitted |
| Duration modifier | `__duration.500ms` and `__duration.1s` render from number, numeric string, and duration string inputs |
| Leading modifier | `__duration.500ms.leading` renders with interval duration |
| View transition modifier | `__viewtransition` renders and combines with duration/leading |
| Normal Datastar markup style | Hand-written `data-on-interval__duration.500ms` renders unchanged through JSX spread props |
| Attribute evaluation order | Authored `data-signals`, `data-on-interval`, and `data-text` order is preserved |
| Invalid SDK modifiers | Unsupported `delay` modifier is rejected |

## Test File

- `packages/datastar-kit/test/attributes/data-on-interval/data-on-interval.test.tsx`

## Findings

- `data-on-interval` is correctly treated as an expression-valued Datastar attribute.
- The documented `duration`, `leading`, and `viewTransition` modifiers are supported through `mod()`.
- Interval `leading` is rendered as a tag on the `duration` modifier, matching upstream Datastar's parser.
- Hand-written Datastar modifier syntax remains supported through normal JSX/spread props.

## Issues / Fixes

None.

## Considerations

- Datastar denies keyed `data-on-interval:*` at runtime. The SDK renders raw HTML attributes and does not try to reject every invalid handwritten combination.
- Use `leading` together with an explicit `duration` value to avoid ambiguous interval timing.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-on-interval/data-on-interval.test.tsx`
- `pnpm --filter datastar-kit typecheck`
