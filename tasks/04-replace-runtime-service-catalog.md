# T004 — Replace Runtime service catalog with explicit read/reply APIs and app-owned Effect services

## Status

`done`

## Grill level

`5/5` — identity-defining decision.

## Decision

Do **not** expose a public `Runtime` service catalog.

Normal application handlers should use explicit app-facing helpers:

```ts
import { ds, h, read, reply } from "ts-star"

const input = yield* read.signals(ContactForm.schema)
return reply.patch(view(input), { selector: "#result" })
return reply.done()
```

Application dependencies should be ordinary Effect services/layers owned by the app:

```ts
const store = yield* CounterStore
const count = yield* store.increment
return reply.signals({ count })
```

`ts-star` should not wrap pure rendering, response construction, signal decoding, config, error mapping, or live-query hubs in public framework services before those abstractions have earned their weight.

## Naming guidance from the local Remix repo

The useful Remix lesson is contextual naming:

- app-facing APIs should be short when the import/module provides context;
- technical names can live internally or under specific implementation modules;
- runtime/context mechanisms should exist only when they provide a concrete request-scoped capability.

T003 applies this to responses with `reply.*`.

This task applies the same rule to request decoding:

```ts
read.signals(schema)
read.query(schema)
```

rather than:

```ts
platformReadSignals(schema)
platformReadQuery(schema)
SignalDecoder.decode(schema)
```

## Why this task exists

`src/runtime.ts` currently wraps many pure or already-simple operations in Effect services:

- `TsStarConfig`
- `HtmlRenderer`
- `DatastarProtocol`
- `RequestContext`
- `SignalDecoder`
- `ErrorMapper`
- `LiveQueryHub`

This creates an enterprise-style service catalog and duplicates concepts that should be local and explicit:

- `reply.*` should own response construction.
- `read.*` should own request-boundary decoding.
- app-owned Effect services should own domain dependencies.
- `live.query` should consume streams owned by the app.

## Settled decisions

### Normal apps should not provide a ts-star runtime layer

Counter/search/live-query examples should not need `requestRuntimeLayer`, `DatastarProtocol`, `SignalDecoder`, or `ErrorMapper`.

### Request decoding should be plain helpers

Use:

```ts
read.signals(schema)
read.query(schema)
```

These helpers may still be implemented with Effect Platform under the hood, but that plumbing should not leak into app-facing names.

### Error mapping should stay local

Do not keep a public `ErrorMapper` service for now. Use local Effect error handling:

```ts
handler.pipe(
  Effect.catchTag("FormValidationError", (error) =>
    Effect.succeed(reply.signals(validationPayload(error)))
  )
)
```

If examples repeatedly show identical boilerplate, add a recipe or small helper later. Do not introduce a service first.

### Config and rendering should stay explicit

`reply.page` and related helpers should use explicit options or app-local wrappers for script src / page defaults.

Do not keep `TsStarConfig` or `HtmlRenderer` as public services until real renderer adapters prove the need.

### Live-query resources belong to the app

Remove public `LiveQueryHub`. Apps own `PubSub`/`Stream` resources and pass invalidation streams into `live.query`.

## Public API changes to plan

Add or expose as part of the app-facing core:

- `read.signals(schema)`
- `read.query(schema)`
- possibly `read.signalsFrom(request, schema)` / `read.queryFrom(request, schema)` if tests/examples need explicit request variants

Remove from public API:

- `Runtime` namespace
- `requestRuntimeLayer`
- `runtimeCoreLayer`
- `TsStarConfig`
- `HtmlRenderer`
- `DatastarProtocol`
- `RequestContext`
- `SignalDecoder`
- `ErrorMapper`
- `catchMappedErrors`
- `LiveQueryHub`

Internalize only if implementation still needs them. Do not keep public aliases.

## Example policy

Rewrite `examples/runtime-counter.ts` as an app-owned Effect services example:

- keep `CounterStore` as an app service;
- remove ts-star `Runtime` services;
- use `read.signals(...)` for request input;
- use `reply.page`, `reply.signals`, `reply.patch`, or `reply.done` for responses.

The point of the example should be: "Effect services compose naturally with ts-star," not "ts-star has its own runtime service graph."

## Implementation work

- Create the public `read` request helper namespace/module.
- Remove `Runtime` namespace from root exports.
- Delete or internalize the current `src/runtime.ts` service catalog.
- Replace `SignalDecoder` usage with `read.signals(schema)`.
- Replace `DatastarProtocol` usage with `reply.*` from T003.
- Replace `catchMappedErrors`/`ErrorMapper` with local Effect error handling in examples.
- Remove `LiveQueryHub` in favor of app-owned PubSub/Stream resources.
- Rewrite the runtime counter example as an app-owned Effect services example.
- Update tests to verify the absence of public Runtime APIs and the presence of `read.*` helpers.

## Acceptance criteria

- Normal examples use `h`, `ds`, `read`, and `reply` without a ts-star runtime layer.
- App domain services remain normal Effect services/layers.
- Public API no longer contains a generic `Runtime` namespace.
- Request decoding is concise and locally readable.
- Error handling is explicit in handlers or recipes, not hidden in a framework service.
- Live-query resources are app-owned.
- Tests pass without `requestRuntimeLayer` as a public concept.

## Anti-goals

- Do not remove Effect from application architecture.
- Do not replace `Runtime` with another generic service catalog.
- Do not keep old service aliases for compatibility.
- Do not make `read` a dumping ground for generic HTTP helpers.
- Do not add a public renderer/config service before a real adapter exists.
