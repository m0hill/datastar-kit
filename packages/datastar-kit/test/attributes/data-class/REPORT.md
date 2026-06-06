# `data-class` Attribute Report

## Status

PASS — `datastar-kit` renders the documented `data-class` forms and keyed case modifiers correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-class/data-class.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`
- Upstream Datastar `library/src/plugins/attributes/class.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Keyed class form | `data-class:font-bold="$foo == 'strong'"` with `h()` and JSX |
| Multi-class object form | `data-class="{success: ..., 'font-bold': ...}"` with `h()`, JSX strings, and object values |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Signal refs | `signal()` values render as `$name` expressions |
| `js` expression helpers | Template expressions render as Datastar expression source |
| Multi-token class keys | Object key such as `"border rounded"` is preserved for Datastar's runtime splitting behavior |
| Primitive expression values | `true` and `false` render as expression strings instead of being omitted |
| Keyed case modifiers | `__case.camel`, `__case.snake`, `__case.kebab`, and `__case.pascal` |
| Normal Datastar markup style | Hand-written `data-class:*__case...` attributes render unchanged through JSX spread props |
| Attribute evaluation order | Authored `data-class` / `data-init` order is preserved |
| Invalid SDK modifiers | Unsupported `prevent` modifier is rejected for keyed `data-class` |
| Unkeyed modifier handling | `mod()` on unkeyed `data-class` is rejected because upstream modifiers affect class keys only |

## Test File

- `packages/datastar-kit/test/attributes/data-class/data-class.test.tsx`

## Findings

- The SDK supports both documented forms:
  - keyed: `data-class:name="expression"`
  - object: `data-class="{name: expression}"`
- `data-class:*` is correctly treated as an expression-valued Datastar attribute, so boolean expression values are serialized to `"true"` / `"false"` rather than being treated as HTML presence attributes.
- Keyed `case` modifiers render correctly through `mod()`.
- Hand-written Datastar modifier syntax remains supported through normal JSX/spread props.

## Issues / Fixes

None.

## Considerations

- `data-class` modifiers only apply to keyed class-name suffixes. Use object syntax when you need exact class names without casing conversion.
- For hand-written modifier attributes containing dots, JSX spread props are the safest syntax, e.g. `{...{ "data-class:my-class__case.camel": "$foo" }}`.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-class/data-class.test.tsx`
- `pnpm --filter datastar-kit typecheck`
