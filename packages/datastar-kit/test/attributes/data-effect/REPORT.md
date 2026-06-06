# `data-effect` Attribute Report

## Status

PASS — `datastar-kit` renders documented `data-effect` expressions correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-effect/data-effect.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- Upstream Datastar `library/src/plugins/attributes/effect.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Effect expression form | `data-effect="$foo = $bar + $baz"` with `h()` and JSX |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Action expressions | Hand-written action expression such as `@get('/sync')` renders correctly |
| Signal refs | `signal()` refs render as `$name` expressions |
| `js` expression helpers | Template expressions render as Datastar expression source |
| `el` expression variable | Authored expressions containing `el` are preserved |
| Primitive expression values | `true`, `false`, and `0` render as expression strings instead of being omitted |
| Attribute evaluation order | Authored `data-signals`, `data-effect`, and `data-text` order is preserved |
| Modifiers | `mod()` is rejected because upstream `data-effect` has no supported modifiers |

## Test File

- `packages/datastar-kit/test/attributes/data-effect/data-effect.test.tsx`

## Findings

- `data-effect` is correctly treated as an expression-valued Datastar attribute.
- Plain string values stay raw, so normal Datastar expressions can be authored directly.
- `js` helpers and `Signal` refs render to Datastar expression source as expected.
- Explicit SDK modifier wrappers are intentionally rejected for `data-effect`; the upstream Datastar attribute plugin does not consume modifiers.

## Issues / Fixes

None.

## Considerations

- Datastar denies keyed `data-effect:*` at runtime. The SDK renders raw HTML attributes and does not try to reject every invalid handwritten combination.
- Use `data-computed` for read-only derived values; use `data-effect` for actions and side effects.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-effect/data-effect.test.tsx`
- `pnpm --filter datastar-kit typecheck`
