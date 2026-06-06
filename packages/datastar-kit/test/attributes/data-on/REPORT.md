# `data-on` Attribute Report

## Status

PASS — `datastar-kit` renders documented `data-on:*` event listener expressions and modifiers correctly. No SDK fix was required.

## Source Reviewed

- `packages/datastar-kit/test/attributes/data-on/data-on.md`
- `packages/datastar-kit/src/html.ts`
- `packages/datastar-kit/src/jsx.ts`
- `packages/datastar-kit/src/ds/attribute-metadata.ts`
- `packages/datastar-kit/src/ds/modifier-rendering.ts`
- Upstream Datastar `library/src/plugins/attributes/on.ts`

## Behaviors Tested

| Behavior | Coverage |
| --- | --- |
| Keyed event form | `data-on:click="$foo = ''"` with `h()` and JSX |
| Action expressions | `post("/submit")` renders as `@post(...)` |
| Raw Datastar expression strings | JSX strings stay raw expressions and are only HTML-escaped by the renderer |
| Signal refs / `js` helpers | Template expressions render as Datastar expression source |
| `evt` argument | Expressions containing `evt` are preserved |
| `el` expression variable | Expressions containing `el` are preserved |
| Primitive expression values | `true`, `false`, and `0` render as expression strings instead of being omitted |
| Listener option modifiers | `__once`, `__passive`, and `__capture` |
| Event case modifiers | `__case.camel`, `__case.snake`, `__case.kebab`, and `__case.pascal` |
| Timing modifiers | `__delay`, `__debounce`, and `__throttle` variants |
| View transition modifier | `__viewtransition` |
| Event target modifiers | `__window`, `__document`, and `__outside` |
| Event side-effect modifiers | `__prevent` and `__stop` |
| Normal Datastar markup style | Hand-written `data-on:click__window__debounce.500ms.leading` renders unchanged through JSX spread props |
| Attribute evaluation order | Authored `data-indicator`, `data-on`, and `data-attr` order is preserved |
| Invalid SDK modifiers | Unsupported `prop` modifier is rejected |
| Unkeyed modifier handling | `mod()` on unkeyed `data-on` is rejected because event names are required |

## Test File

- `packages/datastar-kit/test/attributes/data-on/data-on.test.tsx`

## Findings

- `data-on:*` is correctly treated as an expression-valued Datastar attribute.
- All documented `data-on` modifier categories are supported through `mod()`.
- Submit/action examples render correctly, including explicit `prevent` for forms.
- Hand-written Datastar modifier syntax remains supported through normal JSX/spread props.

## Issues / Fixes

None.

## Considerations

- Datastar requires an event key for `data-on`. The SDK rejects `mod()` on unkeyed `data-on`, but raw handwritten invalid attributes can still be rendered.
- Avoid combining mutually exclusive listener targets (`window`, `document`, `outside`) unless you intentionally want Datastar's runtime precedence.

## Verification

- `pnpm --filter datastar-kit exec vitest run test/attributes/data-on/data-on.test.tsx`
- `pnpm --filter datastar-kit typecheck`
