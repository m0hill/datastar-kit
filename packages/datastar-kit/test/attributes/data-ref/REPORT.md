# `data-ref` Attribute Report

## Status

PASS after SDK fix — keyed/value `data-ref` rendering works, and the SDK now rejects misleading `case` modifiers on unkeyed `data-ref`.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-ref/data-ref.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`
- Upstream Datastar `library/src/plugins/attributes/ref.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Keyed ref form | `data-ref:foo` with `h()` and JSX |
| Value ref form | `data-ref="foo"` with `h()`, JSX strings, and `Signal` refs |
| Signal usage markup | `$foo.tagName` in `data-text` renders with a ref source |
| Presence semantics | Keyed ref attributes render as presence attributes; falsey values omit them |
| Keyed case modifiers | `__case.camel`, `__case.snake`, `__case.kebab`, and `__case.pascal` |
| Normal Datastar markup style | Hand-written `data-ref:*__case...` attributes render unchanged through JSX spread props |
| Attribute evaluation order | `data-ref` renders before `data-init` when authored first |
| Invalid SDK modifiers | Unsupported `prevent` modifier is rejected |
| Unkeyed modifier handling | `mod()` with `case` on exact `data-ref` is rejected |

## Test File

- `packages/datastar-kit/test/attributes/data-ref/data-ref.test.tsx`

## Findings

- The SDK supports both documented signal-name forms:
  - keyed: `data-ref:signal-name`
  - value: `data-ref="signalName"`
- `Signal` refs render as bare signal names for `data-ref="..."`, not `$signal`, which matches Datastar's expected value form.
- Keyed `data-ref:*` is correctly treated as a presence Datastar attribute.
- Keyed `case` modifiers render correctly through `mod()`.
- Hand-written Datastar modifier syntax remains supported through normal JSX/spread props.

## Issues / Fixes

### Issue: unkeyed `data-ref` incorrectly accepted SDK `case` modifiers

**Problem:** `src/ds/attribute-metadata.ts` listed exact `data-ref` as a `case` modifier target. Upstream Datastar only applies `modifyCasing` when the signal name is supplied as a keyed suffix (`data-ref:*`). If the signal name is supplied in the value (`data-ref="panel"`), the modifier is ignored.

**Possible solutions:**

1. Keep accepting the modifier and document that upstream ignores it for value form.
2. Try to rewrite the signal-name value server-side when `case` is supplied.
3. Reject `mod()` on unkeyed `data-ref` so SDK helpers only expose behavior Datastar actually applies.

**Chosen solution:** Option 3. Exact `data-ref` was removed from the SDK `case` modifier target list; only `data-ref:*` accepts `case` modifiers now.

**Files changed:**

- `packages/datastar-kit/src/ds/attribute-metadata.ts`

## Considerations

- Use keyed syntax plus `mod(..., { case })` when Datastar should apply casing conversion.
- Use value syntax (`data-ref="panel"`) or `Signal` refs when the exact signal name is already known.
- For hand-written modifier attributes containing dots, JSX spread props are the safest syntax, e.g. `{...{ "data-ref:my-ref__case.kebab": true }}`.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-ref/data-ref.test.tsx test/jsx.test.tsx`
- `pnpm --filter datastar-kit typecheck`
- `pnpm --filter datastar-kit test`
