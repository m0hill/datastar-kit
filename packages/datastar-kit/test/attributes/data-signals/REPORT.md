# `data-signals` Attribute Report

## Status

PASS after SDK fix — keyed/object `data-signals` rendering works, `ifmissing` works on both forms, and the SDK now rejects misleading `case` modifiers on unkeyed `data-signals`.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-signals/data-signals.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/state.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`
- Upstream Datastar `library/src/plugins/attributes/signals.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Keyed signal form | `data-signals:foo="1"` with `h()` and JSX |
| Nested dot notation | `data-signals:foo.bar="1"` |
| Object signal form | `data-signals="{foo: {bar: 1, baz: 2}}"` with `h()`, JSX strings, and object values |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| State helpers | `state(...).defaults` and nested signal refs render correctly |
| Local signal refs | `local("saving")` renders as `$_saving` when used in expressions |
| Signal removal values | `null` and `undefined` serialize for runtime removal semantics |
| Keyed primitive values | `true`, `false`, `0`, and empty string render as expression values, not presence/omission |
| `__ifmissing` modifier | Works for exact `data-signals` and keyed `data-signals:*` |
| Keyed case modifiers | `__case.camel`, `__case.snake`, `__case.kebab`, and `__case.pascal` |
| Normal Datastar markup style | Hand-written keyed modifier attributes render unchanged through JSX spread props |
| DOM override ordering | Later `data-signals` definitions render after earlier ones when authored that way |
| Invalid SDK modifiers | Unsupported `prevent` modifier is rejected |
| Unkeyed case handling | `case` on exact `data-signals` is rejected |

## Test File

- `packages/datastar-kit/test/attributes/data-signals/data-signals.test.tsx`

## Findings

- The SDK supports both documented forms:
  - keyed: `data-signals:name="expression"`
  - object: `data-signals="{name: expression}"`
- Keyed `data-signals:*` is correctly treated as expression-valued despite also being a Datastar presence-style attribute for raw boolean handling.
- `ifMissing` is valid on both exact and keyed forms.
- Keyed `case` modifiers render correctly through `mod()`.
- Hand-written Datastar modifier syntax remains supported through normal JSX/spread props.

## Issues / Fixes

### Issue: unkeyed `data-signals` incorrectly accepted SDK `case` modifiers

**Problem:** `src/ds/attribute-metadata.ts` used one modifier target for both exact `data-signals` and keyed `data-signals:*`. That made `data-signals={mod({...}, { case: "kebab" })}` render a `__case` suffix even though upstream Datastar only applies `modifyCasing` when a keyed suffix exists. Exact/object-form keys are not transformed by the modifier.

**Possible solutions:**

1. Keep accepting `case` and document that upstream ignores it for object form.
2. Rewrite object-form keys server-side when `case` is supplied.
3. Split exact and keyed signal modifier targets so exact `data-signals` still accepts `ifMissing`, while only keyed `data-signals:*` accepts `case`.

**Chosen solution:** Option 3. Added a keyed signal modifier target internally and updated modifier compatibility so `ifMissing` remains valid on both forms, while `case` is only valid on keyed signal attributes.

**Files changed:**

- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`

## Considerations

- Use object syntax for exact object keys. Use keyed syntax plus `mod(..., { case })` when Datastar should apply casing conversion.
- Signal names containing `__` are invalid in Datastar because `__` is the modifier delimiter; avoid generating such names in raw handwritten attributes.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-signals/data-signals.test.tsx test/jsx.test.tsx`
- `pnpm --filter datastar-kit typecheck`
- `pnpm --filter datastar-kit test`
