# `data-computed` Attribute Report

## Status

PASS after SDK fix — keyed and object `data-computed` rendering works, and the SDK now rejects misleading modifiers on unkeyed `data-computed`.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-computed/data-computed.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`
- Upstream Datastar `library/src/plugins/attributes/computed.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Keyed computed form | `data-computed:foo="$bar + $baz"` with `h()` and JSX |
| Object computed form | `data-computed="{foo: () => $bar + $baz}"` with `h()`, JSX strings, and object values |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Signal refs | `signal()` refs render as `$name` expressions where used by `js` helpers |
| `js` expression helpers | Callable object entries authored with the `js` tagged-template helper render as Datastar callables |
| Nested object entries | Nested computed paths render as nested object expressions |
| Primitive expression values | `true`, `false`, and `0` render as expression strings instead of being omitted |
| Keyed case modifiers | `__case.camel`, `__case.snake`, `__case.kebab`, and `__case.pascal` |
| Normal Datastar markup style | Hand-written `data-computed:*__case...` attributes render unchanged through JSX spread props |
| Attribute evaluation order | Authored `data-computed` / `data-text` order is preserved |
| Invalid SDK modifiers | Unsupported `prevent` modifier is rejected for keyed `data-computed` |
| Unkeyed modifier handling | `mod()` on unkeyed `data-computed` is rejected |

## Test File

- `packages/datastar-kit/test/attributes/data-computed/data-computed.test.tsx`

## Findings

- The SDK supports both documented forms:
  - keyed: `data-computed:name="expression"`
  - object: `data-computed="{name: () => expression}"`
- Keyed `case` modifiers render correctly through `mod()`.
- Hand-written Datastar modifier syntax remains supported through normal JSX/spread props.
- Object-form callable values should be authored as Datastar expression source, e.g. with the `js` tagged-template helper. Plain server-side JavaScript functions are not serialized as executable Datastar callables.

## Issues / Fixes

### Issue: unkeyed `data-computed` incorrectly accepted SDK `case` modifiers

**Problem:** `src/ds/attribute-metadata.ts` listed exact `data-computed` as a modifier target. This allowed JSX like `data-computed={mod({...}, { case: "camel" })}` to render `data-computed__case.camel="..."`. Upstream Datastar only applies `modifyCasing` when a keyed suffix exists (`data-computed:*`); object-form keys are not transformed by the modifier.

**Possible solutions:**

1. Keep accepting the modifier and document that upstream ignores it for object form.
2. Try to rewrite object-form keys server-side when `case` is supplied.
3. Reject `mod()` on unkeyed `data-computed` so SDK helpers only expose behavior Datastar actually applies.

**Chosen solution:** Option 3. `data-computed` exact was removed from the SDK modifier target list; only `data-computed:*` accepts `case` modifiers now.

**Files changed:**

- `packages/datastar-kit/src/ds/attribute-metadata.ts`

## Considerations

- Use object syntax for exact object keys. Use keyed syntax plus `mod(..., { case })` when Datastar should apply casing conversion.
- For hand-written modifier attributes containing dots, JSX spread props are the safest syntax, e.g. `{...{ "data-computed:my-signal__case.kebab": "$bar + $baz" }}`.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-computed/data-computed.test.tsx test/jsx.test.tsx`
- `pnpm --filter datastar-kit typecheck`
- `pnpm --filter datastar-kit test`
