# Signals

Datastar signals are browser-side values used as sparse request input or UI feedback state. They should not become the authoritative application store.

## Authoring signals

Use `ds.signal(...)` for typed signal references and `ds.dataSignals(...)` / `ds.dataSignal(...)` for initial values:

```tsx
const q = ds.signal<string>("q")

<main {...ds.dataSignals({ q: "" }, { ifMissing: true })}>
  <input {...ds.bind(q)} />
</main>
```

For client-side Datastar expressions that need more than a bare signal, prefer the `ds.expr` tagged template so signal refs and JS literals are quoted consistently:

```tsx
const count = ds.signal<number>("count")

<button {...ds.dataAttr("disabled", ds.expr`${count} >= ${10}`)}>+</button>
```

Use private/local names such as `_validation.email` for UI-only feedback that should not be treated as durable state.

## Reading signals

Use `read.signals(request)` at Datastar action boundaries when you want parsed JSON object signal state without schema validation. Use `read.signals(request, schema)` when you want a Standard Schema-compatible validator to check and infer the payload.

## Patching signals

Use `reply.signals(...)` for SSE signal patches or `reply.directSignals(...)` as an explicit direct-response escape hatch.
