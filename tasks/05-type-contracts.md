# T005 — Create end-to-end type contracts

## Status

`pending`

## Why this task exists

The current framework has local type safety, but not end-to-end type safety.

Example problem:

```ts
const CounterSignals = Schema.Struct({ count: Schema.Number })
const count = signal<number, "count">("count")
dataSignals({ count: 0 })
platformPatchSignalsResponse({ count: signals.count + 1 })
```

These are manually kept in sync. They can drift.

A framework promising strong type safety should derive as much as possible from one contract.

## Target outcome

A single source of truth should drive:

- initial signal shape;
- signal handles used in expressions;
- request decoding;
- patch shape;
- action URL helpers;
- query/body schemas;
- route parameters.

## Possible API direction

Illustrative only:

```ts
const Counter = Signals.make("Counter", Schema.Struct({
  count: Schema.Number,
  draft: Schema.String
}))

const s = Counter.signals

view(
  dataSignals(Counter.initial({ count: 0, draft: "" })),
  text(s.count),
  on("click", Counter.action("increment"))
)

const increment = Action.signals(Counter.schema).handle(({ signals }) =>
  patchSignals(Counter.patch({ count: signals.count + 1 }))
)
```

Again, exact syntax is not the point. The important part is reducing duplicated contracts.

## Areas to type

### Signals

- schema-derived signal handles;
- nested signal paths;
- local/private signal naming;
- patch objects with `null` removal semantics;
- maybe branded signal names.

### Routes/actions

- typed route declarations;
- generated Datastar action expressions;
- method/content-type compatibility;
- query parameter schemas;
- path params if supported.

### Responses

- patch signal payload must match declared signal contract where possible;
- direct JSON signal responses should validate/encode through schema where possible;
- HTML patch helpers should encourage top-level IDs unless selector is provided.

## Implementation work

- Design signal contract API around Effect Schema.
- Add typed route/action helper prototypes.
- Add compile-time tests for invalid signal/route usage.
- Add runtime validation at request boundaries.
- Decide how much inference is practical without creating type gymnastics that hurt DX.

## Acceptance criteria

- A basic app defines signal schema once.
- Signal handles, initial values, decoder, and patches derive from that definition.
- Route/action mismatches are harder to write.
- Compile-time tests cover the important type guarantees.
- Runtime decode errors remain explicit and typed.

## Anti-goals

- Do not build a full tRPC clone.
- Do not type every possible JavaScript expression.
- Do not make the simple case verbose just to satisfy maximal type inference.
