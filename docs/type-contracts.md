# End-to-end type contracts

`ts-star` should let a small application define its request/view contract once and reuse it across signals, action URLs, decoders, and patches.

The first contract API lives in `src/contracts.ts`. It is intentionally small: it reduces the highest-value duplication without trying to become a tRPC clone or a full route compiler.

## Signal contracts

Use `defineSignals(name, schema)` with an Effect Schema:

```ts
const Counter = defineSignals(
  "Counter",
  Schema.Struct({
    count: Schema.Number,
    draft: Schema.String
  })
)
```

The returned contract derives:

- `Counter.schema` — the source schema.
- `Counter.signals` — typed Datastar signal handles (`Counter.signals.count`).
- `Counter.initial(values, options)` — `data-signals` attributes typed from the schema output.
- `Counter.read` / `Counter.readFromRequest(request)` — request-boundary signal decoding.
- `Counter.decode(signalDecoder)` — decoding through the Effect-native `SignalDecoder` service.
- `Counter.patch(values)` — typed partial signal patches with `null` removal semantics.
- `Counter.patchResponse(values, options, responseOptions)` — Datastar-safe signal patch response.

Example:

```ts
const s = Counter.signals

h(
  "main",
  Counter.initial({ count: 0, draft: "" }, { ifMissing: true }),
  h("output", text(s.count), "0")
)

const increment = Effect.gen(function* () {
  const signals = yield* Counter.read
  return Counter.patchResponse({ count: signals.count + 1 })
})
```

Compile-time checks cover missing initial keys, wrong patch value types, unknown signal handles, and nested signal paths.

## Signal patches

`SignalPatch<T>` is a partial object matching the signal shape. Values may be:

- the same type as the signal field;
- a nested partial patch for nested objects;
- `null` to remove a signal/path.

This mirrors Datastar signal removal semantics while keeping patches tied to the schema-derived shape.

## Query action contracts

Use `defineQueryAction(...)` when a Datastar action URL and a route decoder share the same query schema:

```ts
const Search = defineQueryAction({
  name: "search",
  method: "get",
  path: "/search",
  querySchema: Schema.Struct({
    q: Schema.String,
    page: Schema.FiniteFromString
  })
})

on("input", Search.actionWithQuery({ q, page: 1 }))

const route = Search.readQuery.pipe(
  Effect.map(({ q, page }) => ...)
)
```

The query helper requires the schema-derived keys when constructing URLs/actions and rejects unknown keys in object literals.

## Plain action contracts

Use `defineAction({ name, method, path })` when no typed query payload is needed. It records method/path together and generates the matching Datastar fetch expression.

## Runtime validation

Contracts do not replace runtime decoding. `read`, `readFromRequest`, `readQuery`, and `readQueryFromRequest` still use Effect Schema and fail explicitly with typed schema errors at the request boundary.

## Current limits

- Path params are not typed yet.
- Form/body contracts beyond signals and query params are not finalized.
- Patch runtime validation is intentionally light; the compile-time type catches the common drift, while request decoding remains the authoritative runtime guard.
- The API is a prototype and may be folded into future `Page`/`Action` abstractions.
