# Signals

Datastar signals are browser-side values used as sparse request input or UI feedback state. They should not become the authoritative application store.

## Authoring signals

Use `ds.signal(...)` for typed signal references and `ds.dataSignals(...)` / `ds.dataSignal(...)` for initial values:

```ts
const q = ds.signal<string, "q">("q")

h("main", props(ds.dataSignals({ q: "" }, { ifMissing: true })))
```

Use private/local names such as `_validation.email` for UI-only feedback that should not be treated as durable state.

## Reading signals

Use `read.signals(request, schema)` at Datastar action boundaries. The schema can come from any Standard Schema-compatible validator.

## Patching signals

Use `reply.signals(...)` for SSE signal patches or `reply.directSignals(...)` as an explicit direct-response escape hatch.
