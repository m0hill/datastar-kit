# `data-json-signals` Attribute Report

## Status

PASS — `datastar-kit` renders `data-json-signals` presence, filter, and `__terse` modifier forms correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-json-signals/data-json-signals.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`
- Upstream Datastar `library/src/plugins/attributes/jsonSignals.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Display-all presence form | `data-json-signals` with `h()` and JSX |
| Falsey presence values | `false`, `null`, and `undefined` omit `data-json-signals` |
| Raw filter expressions | Hand-written `{include: /.../}` strings render unchanged except normal HTML escaping |
| Object filter syntax | `{ include: /^app/, exclude: /password/ }` serializes to Datastar expression source |
| Native regular expressions | `RegExp` values serialize as `new RegExp(...)` expressions |
| Regex helper | `regex("user", "i")` serializes to `new RegExp("user", "i")` |
| Raw `js` helpers | Explicit filter expressions render as authored |
| `__terse` modifier | `mod({ terse: true })` and filtered terse forms render correctly |
| Normal Datastar markup style | Hand-written `data-json-signals__terse` renders unchanged through JSX spread props |
| Attribute evaluation order | Authored `data-signals` / `data-json-signals` order is preserved |
| Invalid SDK modifiers | Unsupported `prevent` modifier is rejected |

## Test File

- `packages/datastar-kit/test/attributes/data-json-signals/data-json-signals.test.tsx`

## Findings

- `data-json-signals` is correctly treated as a Datastar presence attribute when the JSX value is `true`.
- Optional filter values can be authored as raw Datastar strings, `js` expressions, or SDK object values.
- The documented `__terse` modifier is supported through `mod()`.
- Hand-written Datastar modifier syntax remains supported through normal JSX/spread props.

## Issues / Fixes

None.

## Considerations

- `data-json-signals` denies keyed suffixes at runtime. The SDK renders raw HTML attributes and does not try to reject every invalid handwritten combination.
- Use `regex()` or native `RegExp` values when building filter objects through JSX to avoid hand-escaping regular-expression source.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-json-signals/data-json-signals.test.tsx`
- `pnpm --filter datastar-kit typecheck`
