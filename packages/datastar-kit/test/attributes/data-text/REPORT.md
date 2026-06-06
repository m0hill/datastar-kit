# `data-text` Attribute Report

## Status

PASS — `datastar-kit` renders documented `data-text` expressions correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-text/data-text.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- Upstream Datastar `library/src/plugins/attributes/text.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Text expression form | `data-text="$foo"` with `h()` and JSX |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Signal refs | `signal()` refs render as `$name` expressions |
| `js` expression helpers | Template expressions render as Datastar expression source |
| `el` expression variable | Authored expressions containing `el` are preserved |
| Primitive expression values | `true`, `false`, and `0` render as expression strings instead of being omitted |
| Fallback child content | Static child text is escaped independently from the `data-text` expression |
| Attribute evaluation order | Authored `data-signals` and `data-text` order is preserved |
| Modifiers | `mod()` is rejected because upstream `data-text` has no supported modifiers |

## Test File

- `packages/datastar-kit/test/attributes/data-text/data-text.test.tsx`

## Findings

- `data-text` is correctly treated as an expression-valued Datastar attribute.
- Plain string values stay raw, so normal Datastar expressions can be authored directly.
- `Signal` refs and `js` helpers render to Datastar expression source as expected.
- Explicit SDK modifier wrappers are intentionally rejected for `data-text`; the upstream Datastar attribute plugin does not consume modifiers.

## Issues / Fixes

None.

## Considerations

- Datastar denies keyed `data-text:*` at runtime. The SDK renders raw HTML attributes and does not try to reject every invalid handwritten combination.
- Any fallback child content is server-rendered and escaped normally before Datastar replaces text content at runtime.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-text/data-text.test.tsx`
- `pnpm --filter datastar-kit typecheck`
