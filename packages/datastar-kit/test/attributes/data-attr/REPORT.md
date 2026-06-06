# `data-attr` Attribute Report

## Status

PASS — `datastar-kit` renders the documented `data-attr` forms correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-attr/data-attr.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- Upstream Datastar `library/src/plugins/attributes/attr.ts`

## Behaviors Tested

| Behavior                           | Coverage                                                                                                           |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Keyed form                         | `data-attr:aria-label="$foo"` with `h()` and JSX                                                                   |
| Multi-attribute object form        | `data-attr={{ "aria-label": signal, disabled: signal, ... }}`                                                      |
| Raw Datastar expression strings    | JSX strings stay raw expressions and are HTML-escaped safely                                                       |
| Normal Datastar markup style       | Hand-written `data-attr="{'aria-label': $foo, ...}"` and keyed string expressions render without SDK serialization |
| Signal refs                        | `signal()` values render as `$name` expressions for keyed and object forms                                         |
| `js` expression helpers            | Template expressions render as Datastar expression source                                                          |
| Primitive expression values        | `true`, `false`, and `0` are rendered instead of being omitted                                                     |
| Runtime stringify branch authoring | Object/array target values render as expressions Datastar can stringify at runtime                                 |
| `el` expression variable           | Authored expressions containing `el` are preserved                                                                 |
| Datastar target attribute names    | Targets like `data-bind:mutation-rate` render correctly through spread props                                       |
| Attribute evaluation order         | Authored prop order is preserved in rendered HTML                                                                  |
| Modifiers                          | `mod(..., { case: "camel" })` is rejected because upstream `data-attr` has no supported modifiers                  |

## Test File

- `packages/datastar-kit/test/attributes/data-attr/data-attr.test.tsx`

## Findings

- The SDK supports both documented forms:
  - keyed: `data-attr:name="expression"`
  - object: `data-attr="{name: expression}"`
- `data-attr` is correctly treated as an expression-valued Datastar attribute, not a presence attribute.
- Falsey expression values such as `false` and `0` are preserved in rendered HTML.
- Hand-written Datastar strings are not serialized by the SDK; only normal HTML escaping is applied during rendering.
- Explicit SDK modifier wrappers are intentionally rejected for `data-attr`; the upstream Datastar attribute plugin does not consume modifiers.

## Issues / Fixes

None.

## Considerations

- In JSX, plain string values are raw Datastar expressions. To set a literal string target value, write an expression string such as `"'Save'"`, or use the `js` tagged-template helper with a string interpolation.
- For target attribute names that contain more than one colon, use JSX spread props, e.g. `{...{ "data-attr:data-bind:name": expr }}`.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-attr/data-attr.test.tsx`
- `pnpm --filter datastar-kit typecheck`
