# `data-bind` Attribute Report

## Status

PASS — `datastar-kit` renders the documented `data-bind` forms and SDK modifier helpers correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-bind/data-bind.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`
- Upstream Datastar `library/src/plugins/attributes/bind.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Keyed signal form | `data-bind:foo` with `h()` and JSX |
| Value signal form | `data-bind="foo"` with `h()`, JSX strings, and `Signal` refs |
| Initial element value | `data-bind:foo-bar` plus `value="baz"` renders in documented order |
| Presence semantics | Keyed bind attributes render as presence attributes; `false` omits them |
| Signal-name casing modifiers | `__case.camel`, `__case.snake`, `__case.kebab`, and `__case.pascal` |
| Property binding modifier | `__prop.checked` on exact and keyed forms |
| Event binding modifier | `__event.input.change` and `__event.change` |
| Normal Datastar markup style | Hand-written `data-bind:*__prop...` attributes render unchanged through JSX spread props |
| Attribute evaluation order | Authored order is preserved for `data-signals`, `data-bind`, and `value` |
| Documented native scenarios | Checkbox array binding and file input binding render as expected |
| Invalid SDK modifiers | Unsupported `prevent` modifier is rejected for `data-bind` |

## Test File

- `packages/datastar-kit/test/attributes/data-bind/data-bind.test.tsx`

## Findings

- The SDK supports both documented signal-name forms:
  - keyed: `data-bind:signal-name`
  - value: `data-bind="signalName"`
- `Signal` refs render as bare signal names for `data-bind="..."`, not `$signal`, which matches Datastar's expected value form.
- Keyed `data-bind:*` is correctly treated as a presence Datastar attribute.
- The SDK supports all documented `data-bind` modifiers via `mod()`:
  - `case`
  - `prop`
  - `event`
- Hand-written Datastar modifier syntax is still supported by using normal JSX/spread props; the SDK does not force helper usage.

## Issues / Fixes

None.

## Considerations

- Datastar treats `data-bind` key and value as exclusive at runtime. The SDK renders raw HTML attributes and does not try to reject every invalid handwritten combination.
- For hand-written attributes that contain dots or multiple special characters, JSX spread props are the safest syntax, e.g. `{...{ "data-bind:is-checked__prop.checked__event.change": true }}`.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-bind/data-bind.test.tsx`
- `pnpm --filter datastar-kit typecheck`
