# Signal contracts

`contract.signals(schema)` is the schema-derived signal contract API. It keeps the high-value type safety without coupling contracts to routing, request decoding, or response construction.

```ts
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { contract, ds, h, props, read, reply } from "ts-star"

const Contact = contract.signals(
  Schema.Struct({
    name: Schema.String,
    email: Schema.String
  })
)

const form = h(
  "form",
  props(Contact.initial({ name: "", email: "" }, { ifMissing: true })),
  h("input", props({ name: "name" }, ds.bind(Contact.$.name))),
  h("input", props({ name: "email" }, ds.bind(Contact.$.email)))
)

const submit = Effect.gen(function*() {
  const input = yield* read.signals(Contact.schema)
  return reply.signals(Contact.patch({ email: input.email.trim() }))
})
```

## Returned contract

`contract.signals(schema)` returns a `contract.SignalContract`:

- `schema` — the original Effect Schema decoder.
- `$` — typed Datastar signal references, matching Datastar's `$signal` naming.
- `initial(values, options)` — typed `data-signals` props for initial browser signals.
- `patch(values)` — typed partial signal patches with `null` removal semantics.

Use `read.signals(Contact.schema)` at the request boundary and `reply.signals(Contact.patch(...))` at the response boundary. Contracts intentionally do not own HTTP status, routing, request services, or response construction.

## Patch types

Use `contract.PatchOf<typeof Contact>` when a helper needs the typed patch shape:

```ts
type ContactPatch = contract.PatchOf<typeof Contact>

const clearEmail: ContactPatch = {
  email: null
}
```

Signal patches are partial objects matching the signal shape. Nested objects may be patched partially, and `null` removes the signal/path according to Datastar signal patch semantics.

## What contracts do not do

Contracts do not define route/action DSLs, query-string builders, form parsers, or response helpers. Use `ds.*` for Datastar action expressions, Effect Platform for routing and non-Datastar inputs, `read.signals(...)` for Datastar signals, and `reply.*` for Datastar-aware responses.
