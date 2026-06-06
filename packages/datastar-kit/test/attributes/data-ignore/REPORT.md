# `data-ignore` Attribute Report

## Status

PASS — `datastar-kit` renders `data-ignore` presence attributes and the `__self` modifier correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-ignore/data-ignore.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- Upstream Datastar `library/src/engine/engine.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Presence form | `data-ignore` with `h()` and JSX |
| Descendant markup | Third-party-looking descendant attributes render normally inside ignored content |
| Falsey presence values | `false`, `null`, and `undefined` omit `data-ignore` |
| `__self` modifier | `mod({ self: true })` renders `data-ignore__self` |
| Normal Datastar markup style | Hand-written `data-ignore__self` renders unchanged through JSX spread props |
| Hand-written string value | `data-ignore=""` renders exactly as authored |
| Attribute evaluation order | Authored `data-ignore__self` / `data-text` order is preserved |
| Invalid SDK modifiers | Unsupported `prevent` modifier is rejected |

## Test File

- `packages/datastar-kit/test/attributes/data-ignore/data-ignore.test.tsx`

## Findings

- `data-ignore` is correctly treated as a Datastar presence attribute.
- `data-ignore={false}` is omitted, while `data-ignore` / `data-ignore={true}` render as presence attributes.
- The documented `__self` modifier is supported through `mod({ self: true })`.
- Hand-written Datastar syntax remains supported through normal JSX/spread props.

## Issues / Fixes

None.

## Considerations

- Upstream Datastar implements `data-ignore` in the engine scan path rather than as a normal attribute plugin. The SDK behavior matches this by treating it as a presence attribute and supporting only the `self` modifier helper.
- Values on `data-ignore` are not meaningful to Datastar; prefer the presence form or `mod({ self: true })`.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-ignore/data-ignore.test.tsx`
- `pnpm --filter datastar-kit typecheck`
