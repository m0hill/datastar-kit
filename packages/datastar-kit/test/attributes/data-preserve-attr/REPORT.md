# `data-preserve-attr` Attribute Report

## Status

PASS — `datastar-kit` renders `data-preserve-attr` and the `preserve()` helper correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-preserve-attr/data-preserve-attr.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attributes.ts`
- Upstream Datastar bundled morph implementation for `data-preserve-attr`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Single preserved attribute | `data-preserve-attr="open"` with `h()` |
| Multiple preserved attributes | `data-preserve-attr="open class"` with JSX |
| SDK helper | `preserve("open", "class", "aria-expanded")` renders a space-separated list |
| Ordinary string values | Hand-written preserve lists render exactly as authored, with normal HTML escaping |
| Morphing-sensitive attribute order | `value`, `checked`, and `data-preserve-attr` order is preserved |
| Helper validation | Invalid attribute names throw `HtmlNameError` |
| Modifiers | `mod()` is rejected because `data-preserve-attr` has no supported modifiers |

## Test File

- `packages/datastar-kit/test/attributes/data-preserve-attr/data-preserve-attr.test.tsx`

## Findings

- `data-preserve-attr` is rendered as an ordinary value-bearing HTML/Datastar attribute.
- The `preserve()` helper validates each attribute name with the same HTML attribute-name guard used by the renderer.
- Multiple attributes are joined with spaces as Datastar expects.
- Explicit SDK modifier wrappers are intentionally rejected; upstream Datastar does not consume modifiers on `data-preserve-attr`.

## Issues / Fixes

None.

## Considerations

- Preserve lists are plain space-separated strings. Use `preserve()` when possible to catch invalid names early.
- Runtime preservation is applied by Datastar's morphing code; these tests verify the SDK's server-rendered HTML contract for that behavior.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-preserve-attr/data-preserve-attr.test.tsx`
- `pnpm --filter datastar-kit typecheck`
