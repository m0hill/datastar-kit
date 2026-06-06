# `data-on-signal-patch-filter` Attribute Report

## Status

PASS — `datastar-kit` renders `data-on-signal-patch-filter` filter objects correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-on-signal-patch-filter/data-on-signal-patch-filter.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- Upstream Datastar `library/src/plugins/attributes/onSignalPatch.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Include filter | `data-on-signal-patch-filter="{include: /^counter$/}"` with `h()` and JSX |
| Exclude filter | `data-on-signal-patch-filter="{exclude: /changes$/}"` |
| Combined filters | `include` and `exclude` together |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Object filter syntax | Object values serialize to Datastar expression source |
| Native regular expressions | `RegExp` values serialize as `new RegExp(...)` expressions |
| Regex helper | `regex("user", "i")` serializes to `new RegExp("user", "i")` |
| Raw `js` helpers | Explicit filter expressions render as authored |
| Companion patch handler | Filter renders alongside `data-on-signal-patch` |
| Attribute evaluation order | Authored `data-signals`, filter, and patch handler order is preserved |
| Modifiers | `mod()` is rejected because upstream filter attributes have no supported modifiers |

## Test File

- `packages/datastar-kit/test/attributes/data-on-signal-patch-filter/data-on-signal-patch-filter.test.tsx`

## Findings

- The filter attribute supports raw Datastar strings, `js` expressions, and SDK object values.
- `RegExp` values are serialized into expression source Datastar can evaluate.
- The attribute renders correctly alongside `data-on-signal-patch`.
- Explicit SDK modifier wrappers are intentionally rejected; upstream Datastar does not consume modifiers on the filter attribute.

## Issues / Fixes

None.

## Considerations

- `data-on-signal-patch-filter` is read by the `data-on-signal-patch` plugin; it is not a standalone action trigger.
- Use `regex()` or native `RegExp` values when building filter objects through JSX to avoid hand-escaping regular-expression source.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-on-signal-patch-filter/data-on-signal-patch-filter.test.tsx`
- `pnpm --filter datastar-kit typecheck`
