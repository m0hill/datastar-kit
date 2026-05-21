# Signals

Datastar signals are browser-side values used as sparse request input or local UI feedback. They are useful, but they are not your application database.

## Authoring signals

Use `ds.signal(...)` for typed signal references and `ds.dataSignals(...)` / `ds.dataSignal(...)` for initial values:

```tsx
import { ds } from 'datastar-kit'

const q = ds.signal<string>('q')

<main {...ds.dataSignals({ q: '' }, { ifMissing: true })}>
  <input {...ds.bind(q)} />
</main>
```

For client-side Datastar expressions that need more than a bare signal, prefer the `ds.expr` tagged template so signal refs and JavaScript literals are quoted consistently:

```tsx
const count = ds.signal<number>('count')

<button {...ds.dataAttr('disabled', ds.expr`${count} >= ${10}`)}>+</button>
```

Use private/local names such as `_validation.email` for UI-only feedback that should never be treated as durable state.

## Reading signals

Use `read.signals(request)` at Datastar action boundaries when you want parsed JSON object signal state.

```ts
const signals = await read.signals(request)
const input = FormSchema.parse(signals)
```

For user input, validate the decoded state with the schema library your app already uses. Datastar Kit owns Datastar transport decoding; your app owns validation and validator-specific error handling.

`GET` and `DELETE` actions read the `datastar` query parameter. Other methods read the request body as JSON.

## Patching signals

Use `reply.signals(...)` for SSE signal patches or `reply.directSignals(...)` as an explicit direct-response escape hatch:

```ts
return reply.signals({ saved: true })
```

Signal patches are best for UI flags, validation messages, and small browser-side state changes. If the visible HTML depends on backend state, render that HTML on the server and patch elements instead.

Next: [Actions and responses](actions-and-responses.md). Related: [Validation and errors](validation-and-errors.md), [Security](security.md).
