# `data-ignore-morph` Attribute Report

## Status

PASS — `datastar-kit` renders `data-ignore-morph` presence attributes correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-ignore-morph/data-ignore-morph.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- Upstream Datastar `library/src/plugins/watchers/patchElements.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Presence form | `data-ignore-morph` with `h()` and JSX |
| Falsey presence values | `false`, `null`, and `undefined` omit `data-ignore-morph` |
| Hand-written string value | `data-ignore-morph=""` renders exactly as authored |
| Removal patch markup | Rendering the replacement element without `data-ignore-morph` omits the attribute |
| Attribute evaluation order | Authored `id`, `data-ignore-morph`, and `data-text` order is preserved |
| Modifiers | `mod()` is rejected because upstream `data-ignore-morph` has no supported modifiers |

## Test File

- `packages/datastar-kit/test/attributes/data-ignore-morph/data-ignore-morph.test.tsx`

## Findings

- `data-ignore-morph` is correctly treated as a Datastar presence attribute.
- Falsey JSX values omit the attribute, which lets replacement/patch markup remove morph protection by simply not rendering it.
- Explicit SDK modifier wrappers are intentionally rejected; upstream `data-ignore-morph` does not consume modifiers.

## Issues / Fixes

None.

## Considerations

- Values on `data-ignore-morph` are not meaningful to Datastar; prefer the presence form.
- Runtime morph-skipping behavior is implemented by Datastar's patch watcher. These tests verify the SDK's server-rendered HTML contract for that behavior.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-ignore-morph/data-ignore-morph.test.tsx`
- `pnpm --filter datastar-kit typecheck`
