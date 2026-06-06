# `data-show` Attribute Report

## Status

PASS — `datastar-kit` renders documented `data-show` expressions correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-show/data-show.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- Upstream Datastar `library/src/plugins/attributes/show.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Show expression form | `data-show="$foo"` with `h()` and JSX |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Signal refs | `signal()` refs render as `$name` expressions |
| `js` expression helpers | Template expressions render as Datastar expression source |
| Anti-flicker style | `style="display: none"` renders alongside `data-show` |
| `el` expression variable | Authored expressions containing `el` are preserved |
| Primitive expression values | `true`, `false`, and `0` render as expression strings instead of being omitted |
| Attribute evaluation order | Authored `data-signals`, `data-show`, and `data-text` order is preserved |
| Modifiers | `mod()` is rejected because upstream `data-show` has no supported modifiers |

## Test File

- `packages/datastar-kit/test/attributes/data-show/data-show.test.tsx`

## Findings

- `data-show` is correctly treated as an expression-valued Datastar attribute.
- Plain string values stay raw, so normal Datastar expressions can be authored directly.
- `Signal` refs and `js` helpers render to Datastar expression source as expected.
- Explicit SDK modifier wrappers are intentionally rejected for `data-show`; the upstream Datastar attribute plugin does not consume modifiers.

## Issues / Fixes

None.

## Considerations

- Datastar denies keyed `data-show:*` at runtime. The SDK renders raw HTML attributes and does not try to reject every invalid handwritten combination.
- Use `data-class` instead when custom show/hide behavior needs more than toggling display.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-show/data-show.test.tsx`
- `pnpm --filter datastar-kit typecheck`
