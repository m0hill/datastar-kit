# T006 — Shape `ds` as thin Datastar mirrors, not a client DSL

## Status

`pending`

## Grill level

`4/5` — major public-shape decision.

## Decision

Expose a lowercase public `ds` namespace/object for browser-facing Datastar primitives.

```ts
import { ds, h } from "ts-star"

h("button", ds.on("click", ds.post("/increment")), "+")
h("button", ds.on("click", ds.delete("/todo/1")), "Delete")
```

`ds` should mean Datastar attributes, actions, signal references, and expression escape hatches.

It should not include server responses, request decoding, contracts, generic HTML helpers, validation conventions, or framework-owned state helpers.

Server-side concepts live elsewhere:

- `reply.*` for responses;
- `read.*` for request-boundary decoding;
- `contract.*` for schema-derived signal contracts;
- `h` / HTML helpers for markup.

## Why this task exists

`src/datastar.ts` is useful, but it is also where `ts-star` is most likely to grow a frontend mini-language. Helpers like `and`, `or`, `ternary`, `Signal.add`, and `Signal.toggle` invite framework-specific expression authoring instead of simple Datastar expressions.

The framework should mirror Datastar, not wrap it in a new client framework.

## Naming decisions

### Public namespace is `ds`

Use:

```ts
ds.on(...)
ds.post(...)
ds.bind(...)
ds.signal(...)
ds.raw(...)
```

Do not use a public `Datastar` namespace as the app-facing style.

Reason: this matches the short contextual naming chosen for `reply`, `read`, and `contract`.

### Public DELETE helper is `ds.delete(...)`

Use:

```ts
ds.delete("/items/1")
```

not:

```ts
ds.del("/items/1")
```

The internal implementation may use `del`, `delete_`, or an object-property export to work around JavaScript reserved-word binding rules. Hide that workaround from app code.

Do not expose both `delete` and `del` aliases.

## Scope of `ds`

### Keep broad thin mirrors of documented Datastar concepts

Public `ds` can cover Datastar's documented attributes/actions broadly when the helper is a thin mirror.

This is acceptable complexity because it preserves Datastar identity rather than inventing a ts-star abstraction.

Keep helpers for concepts like:

- event attributes: `on`, `onIntersect`, `onInterval`, `onSignalPatch`;
- fetch actions: `get`, `post`, `put`, `patch`, `delete`;
- documented Datastar actions: `peek`, `setAll`, `toggleAll`;
- signal refs: `signal`, `local`;
- expressions/escape hatch: `raw`, `regex`, `queryUrl`;
- binding/display/effect attributes: `bind`, `ref`, `indicator`, `init`, `effect`, `text`, `show`;
- Datastar utility attributes: `jsonSignals`, `preserveAttr`, `ignore`, `ignoreMorph`;
- singular/object attribute forms where Datastar itself supports meaningfully different forms:
  - `dataAttr` / `dataAttrs`
  - `dataClass` / `dataClasses`
  - `dataComputed` / `dataComputeds`
  - `dataStyle` / `dataStyles`
  - `dataSignal` / `dataSignals`

### Remove invented expression DSL helpers

Remove public helpers that try to become a typed JavaScript expression language:

- `not`
- `and`
- `or`
- `ternary`
- `fn`

Use explicit Datastar/JavaScript expressions through `ds.raw(...)` when expressions become complex.

### Keep `Signal` as a reference, not a state API

Keep `Signal` identity/reference behavior and typed nested paths:

```ts
const user = ds.signal<User, "user">("user")
user.path("name")
```

Remove public mutator/comparison/convenience methods:

- `Signal.set`
- `Signal.eq`
- `Signal.neq`
- `Signal.add`
- `Signal.toggle`

Reason: these encourage client-side state manipulation and framework expression DSL growth. For explicit local UI behavior, use `ds.raw(...)`.

### Signal naming helpers

Keep:

```ts
ds.signal(name)
ds.local(name)
```

`ds.local(name)` should create/use underscore-prefixed Datastar local signals that are not sent to the backend.

Remove:

- `inputSignal`
- `privateSignal` as a public alias
- `privateSignalName` from public API unless needed by `ds.local` users directly
- `validationSignal`
- `loadingSignal`
- `validationDataSignal`
- `loadingDataSignal`
- `privateDataSignal` unless `ds.local` has a clear data-signal equivalent

Validation/loading conventions belong in recipes or app code, not in core `ds`.

### Duplicate attribute forms

Remove public value-form duplicates where one keyed form should be canonical:

- `bindValue`
- `refValue`
- `indicatorValue`

Keep singular/object forms for attributes where Datastar itself supports meaningfully different forms, such as `dataAttr`/`dataAttrs`.

### Modifier builders are internal

Keep modifier option types public because users pass option objects:

```ts
ds.on("input", ds.get("/search"), { debounce: 200 })
```

But make string-builder functions internal:

- `onModifiers`
- `intersectModifiers`
- `intervalModifiers`
- similar suffix builders

Users should not manually compose Datastar modifier strings through exported builder functions.

### Serialization internals are internal

Make these internal:

- `toJs`
- `toExpression`

Do not expose a generic serializer for custom helper authors yet. If real custom-helper pressure appears, design that API intentionally later.

### `mergeAttrs` does not belong in `ds`

`mergeAttrs` is useful, but it is generic HTML attribute composition, not a Datastar primitive.

Move it out of `ds` during the HTML/public-surface cleanup:

- to an HTML helper;
- to a top-level helper;
- or to a future `attrs.merge` helper.

Do not keep `ds.mergeAttrs` as part of Datastar's browser-facing namespace.

## Keep candidates for public `ds`

- `raw`
- `signal`
- `local`
- `regex`
- `queryUrl`
- `get`
- `post`
- `put`
- `patch`
- `delete`
- `peek`
- `setAll`
- `toggleAll`
- `on`
- `onIntersect`
- `onInterval`
- `onSignalPatch`
- `onSignalPatchFilter`
- `jsonSignals`
- `preserveAttr`
- `ignore`
- `ignoreMorph`
- `init`
- `effect`
- `text`
- `show`
- `bind`
- `ref`
- `indicator`
- `dataAttr`
- `dataAttrs`
- `dataClass`
- `dataClasses`
- `dataComputed`
- `dataComputeds`
- `dataStyle`
- `dataStyles`
- `dataSignal`
- `dataSignals`

This list is intentionally Datastar-shaped. Final implementation should verify it against the Datastar docs/runtime.

## Removal/internal candidates

Remove from public `ds`:

- `Signal.set`
- `Signal.eq`
- `Signal.neq`
- `Signal.add`
- `Signal.toggle`
- `toJs`
- `toExpression`
- `fn`
- `not`
- `and`
- `or`
- `ternary`
- `inputSignal`
- `privateSignal`
- `privateSignalName` unless a public local-signal name utility is truly needed
- `validationSignal`
- `loadingSignal`
- `privateDataSignal` unless retained as `localDataSignal`
- `validationDataSignal`
- `loadingDataSignal`
- `bindValue`
- `refValue`
- `indicatorValue`
- `mergeAttrs`
- `mergeAttrsStrict`
- `AttributeConflictError`
- modifier string builders such as `onModifiers`, `intersectModifiers`, `intervalModifiers`

## Implementation work

- Create/shape the public `ds` export.
- Hide reserved-word internals while exposing `ds.delete(...)`.
- Keep broad thin Datastar mirrors.
- Remove invented expression combinators from public API.
- Remove `Signal` mutator/comparison helpers.
- Replace public local/private naming with `ds.local(...)` only.
- Move validation/loading helpers to recipes or delete from core.
- Remove public value-form aliases for bind/ref/indicator.
- Move `mergeAttrs` out of `ds` or defer its final home to the HTML boundary task.
- Make serializer and modifier-builder helpers internal.
- Update examples/tests/docs to use `ds.*` and avoid removed helpers.

## Acceptance criteria

- Public app code uses `ds`, not `Datastar`.
- `ds` contains browser-facing Datastar concepts only.
- `ds.delete(...)` is the public DELETE helper.
- Documented Datastar concepts remain easy to express.
- Invented expression DSL helpers are not public.
- `Signal` is a typed reference/path helper, not a client state API.
- There is one canonical local-signal helper: `ds.local(...)`.
- Validation/loading conventions are not core `ds` APIs.
- Modifier string builders and serialization internals are not public APIs.

## Anti-goals

- Do not chase full typed coverage of every JavaScript expression.
- Do not add React/Solid-like reactive state helpers.
- Do not keep aliases because they are convenient.
- Do not make `ds` a junk drawer for server responses, request decoding, contracts, or generic HTML helpers.
- Do not remove helpers merely because they are numerous if they are thin mirrors of documented Datastar behavior.
