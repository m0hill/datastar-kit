# T005 — Replace Contracts with a narrow `contract.signals` API

## Status

`done`

## Grill level

`4/5` — major public-shape decision.

## Decision

Keep a schema-derived signal contract, but make it narrow and app-facing.

Use a lowercase contextual namespace:

```ts
import { contract, ds, h, read, reply } from "ts-star"

const Contact = contract.signals(
  Schema.Struct({
    name: Schema.String,
    email: Schema.String
  })
)
```

The returned object should be small:

```ts
Contact.schema
Contact.$.name
Contact.$.email
Contact.initial({ name: "", email: "" }, { ifMissing: true })
Contact.patch({ email: null })
```

Canonical handler flow:

```ts
const input = yield* read.signals(Contact.schema)
return reply.signals(Contact.patch({ email: input.email }))
```

The contract does **not** read requests, build responses, define routes, or own runtime services.

## Why this task exists

`defineSignals` contains a useful idea: derive typed signal references, initial attributes, and typed signal patches from one schema.

But current `src/contracts.ts` crosses too many layers:

- request reading;
- runtime-service decoding;
- response construction;
- action URL helpers;
- query-action helpers.

That turns a type helper into a mini route/action/runtime abstraction before a real route DSL exists.

## Naming decisions

### Public namespace

Use:

```ts
contract.signals(schema)
```

Do not use:

```ts
Contracts.defineSignals(...)
defineSignals(...)
signals(...)
```

Reasons:

- `contract` matches the short contextual style chosen for `reply` and `read`.
- Lowercase avoids class-like `Contracts` naming.
- Top-level `signals(...)` would collide mentally with `read.signals(...)`, `reply.signals(...)`, and Datastar signals.
- `defineSignals` is acceptable internally, but less pleasant as the final app-facing API.

### No required name string

Use:

```ts
const Contact = contract.signals(schema)
```

not:

```ts
const Contact = contract.signals("Contact", schema)
```

The contract name would only be metadata after removing runtime, route, and response ownership. Do not require a naming concept until it has a concrete job.

### Signal references use `$`

Use:

```ts
Contact.$.email
```

Do not also expose `.refs` or `.signals` aliases.

Reasons:

- Datastar already teaches `$email` as the signal reference syntax.
- `Contact.$.email` is concise and domain-native.
- Avoid aliases; one blessed path is enough.

### Initial signal attributes

Keep:

```ts
Contact.initial(values, options?)
```

This creates typed `data-signals` attributes. Keep `ifMissing` as an explicit option rather than hiding policy in the method name.

### Signal patches

Keep:

```ts
Contact.patch(values)
```

`patch` is a compile-time typed identity helper. It should not runtime-validate and should not create a response.

Use it with `reply.signals(...)`:

```ts
return reply.signals(Contact.patch({ email: null }))
```

## Public types

Expose a minimal contextual type surface under `contract`:

```ts
type ContactPatch = contract.Patch<typeof Contact>
```

Plan:

- expose `contract.Signals<Shape>` as the public return type of `contract.signals(...)`;
- expose `contract.Patch<typeof Contact>` for patch helper typing;
- hide recursive patch internals such as `PatchValue` / `SignalPatchValue`.

`contract.Patch` should accept the contract instance type only:

```ts
type Patch = contract.Patch<typeof Contact>
```

Do not support extra shapes like:

```ts
contract.Patch<RawShape>
contract.Patch<typeof Schema>
```

Reason: accepting only contract instances reinforces the blessed path and avoids another overloaded utility type.

## Request reading stays in `read`

Use:

```ts
read.signals(Contact.schema)
read.query(Search.schema)
```

Do not add back:

```ts
Contact.read
Contact.readFromRequest
Contact.decode
```

Reasons:

- decoding is request-boundary behavior, not a signal-contract responsibility;
- explicit `Contact.schema` keeps `read` simple and avoids contract/read coupling;
- T004 already establishes `read.signals(...)` and `read.query(...)` as app-facing request helpers.

## Response construction stays in `reply`

Use:

```ts
reply.signals(Contact.patch({ name: "Ada" }))
```

Do not add back:

```ts
Contact.patchResponse(...)
```

Reasons:

- response construction belongs to `reply` from T003;
- contracts should not know HTTP status or Datastar response semantics;
- handler flow remains locally readable.

## Route/action contracts are removed for now

Remove:

- `defineAction`
- `defineQueryAction`
- `ActionContract`
- `QueryActionContract`
- `QueryInput` if no longer used

Reason: they record method/path and generate URLs, but actual route registration still happens elsewhere. That creates a second source of truth instead of solving drift.

A future route DSL may reintroduce typed route/action generation, but only when it owns both route registration and URL generation.

Until then use direct Datastar helpers:

```ts
ds.post("/contact")
ds.get(ds.queryUrl("/search", { q }))
```

## Implementation work

- Rename `src/contracts.ts` to `src/contract.ts` or otherwise expose it publicly as lowercase `contract`.
- Replace `defineSignals` with `contract.signals(schema)` as the public API.
- Return only `{ schema, $, initial, patch }` from signal contracts.
- Add/export `contract.Signals<Shape>`.
- Add/export `contract.Patch<typeof Contract>`.
- Hide recursive patch-value internals.
- Remove contract-owned request decoding methods.
- Remove contract-owned response helpers.
- Remove action/query contract helpers.
- Update examples to use:
  - `Contact.$.field` in views;
  - `read.signals(Contact.schema)` in handlers;
  - `reply.signals(Contact.patch(...))` for signal responses.
- Update tests and docs.

## Removal candidates

- `Contracts` namespace
- `src/contracts.ts` public filename/API
- `defineSignals` as public name
- `SignalContract` as public name
- `SignalContract.read`
- `SignalContract.readFromRequest`
- `SignalContract.decode`
- `SignalContract.patchResponse`
- `SignalPatchValue` public type
- `signalPatchJson`
- `signalPatchValue`
- `defineAction`
- `defineQueryAction`
- `ActionContract`
- `QueryActionContract`
- `QueryInput` if unused

## Acceptance criteria

- `contract.signals(schema)` is the only public signal-contract factory.
- The returned object is limited to schema, typed `$` refs, initial attrs, and typed patches.
- `read.*` owns request decoding.
- `reply.*` owns response construction.
- No route/action contract DSL remains public.
- Patch types are clean: `contract.Patch<typeof Contact>`.
- Recursive patch internals are not public API.
- Examples and docs do not use `Contracts.defineSignals`, `Contact.read`, `Contact.decode`, or `Contact.patchResponse`.

## Anti-goals

- Do not build a route compiler.
- Do not recreate tRPC-style abstractions.
- Do not couple contracts to Runtime services.
- Do not keep `.refs`/`.signals` aliases for `Contact.$`.
- Do not accept multiple input shapes in `contract.Patch` just in case.
- Do not make contracts responsible for HTTP or Datastar response semantics.
