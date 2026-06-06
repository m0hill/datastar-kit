# `data-style` Attribute Report

## Status

PASS — `datastar-kit` renders documented `data-style` keyed/object forms correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-style/data-style.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- Upstream Datastar `library/src/plugins/attributes/style.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Keyed style form | `data-style:display="$hiding && 'none'"` with `h()` and JSX |
| Object style form | `data-style="{display: ..., 'background-color': ...}"` with `h()`, JSX strings, and object values |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Signal refs / `js` helpers | Template expressions render as Datastar expression source |
| Object property casing | `backgroundColor` and `border-color` keys are preserved for Datastar's runtime kebab conversion |
| Runtime restoration values | `false`, `null`, and explicit `undefined` expressions render for style restoration semantics |
| Existing inline style | Static `style="..."` renders alongside `data-style` |
| `el` expression variable | Authored expressions containing `el` are preserved |
| Attribute evaluation order | Authored `style`, `data-style`, and `data-text` order is preserved |
| Modifiers | `mod()` is rejected because upstream `data-style` has no supported modifiers |

## Test File

- `packages/datastar-kit/test/attributes/data-style/data-style.test.tsx`

## Findings

- The SDK supports both documented forms:
  - keyed: `data-style:property="expression"`
  - object: `data-style="{property: expression}"`
- `data-style:*` is correctly treated as an expression-valued Datastar attribute, so booleans and `null` become expression strings instead of HTML presence/omission behavior.
- Hand-written Datastar object syntax remains supported through normal JSX strings.
- Explicit SDK modifier wrappers are intentionally rejected; upstream `data-style` does not consume modifiers.

## Issues / Fixes

None.

## Considerations

- JSX `undefined` means “omit this prop” in Datastar Kit. To deliberately render the Datastar expression `undefined`, use `js("undefined")`.
- Use object syntax when you want Datastar to kebab-case style object keys at runtime.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-style/data-style.test.tsx`
- `pnpm --filter datastar-kit typecheck`
