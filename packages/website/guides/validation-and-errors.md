# Validation and errors

Schema validation is optional. Datastar Kit does not generate signal contracts from schemas; author signals directly with `ds.signal(...)` and `ds.dataSignals(...)`, then validate at the request boundary when a handler needs shape guarantees.

## Reading with Standard Schema

`read.signals(request, schema)` accepts any Standard Schema-compatible validator:

```tsx
import { z } from 'zod'
import { ds, read, reply } from 'datastar-kit'

const ContactSchema = z.object({
  name: z.string(),
  email: z.string().email()
})

const name = ds.signal<string>('name')
const email = ds.signal<string>('email')

const form = (
  <form {...ds.dataSignals({ name: '', email: '' }, { ifMissing: true })}>
    <input name="name" {...ds.bind(name)} />
    <input name="email" {...ds.bind(email)} />
  </form>
)

async function submit(request: Request): Promise<Response> {
  const input = await read.signals(request, ContactSchema)
  return reply.signals({ email: input.email.trim() })
}
```

This keeps the core small and avoids coupling signal authoring to a specific validation library. Standard Schema remains available when request-boundary type inference and validator portability are useful.

## Error categories

Recoverable user-facing errors should usually be returned as successful Datastar responses so the browser runtime applies the UI update. Do not rely on non-`200` response bodies to patch the page.

- **Validation errors** — input is syntactically valid enough to understand, but fails form/domain validation. Return `200` Datastar patches near the relevant fields.
- **Domain/action errors** — the action cannot complete. Return a predictable UI patch if the current Datastar action should update the page, otherwise return an ordinary status response.
- **Decode errors** — malformed JSON signals, non-object signal payloads, or Standard Schema failures. These can map to `400` unless a handler deliberately converts them to UI patches.
- **Fatal errors** — unexpected defects should be logged/traced by the app and return safe generic responses, not stack traces.

## Validation signal convention

A useful pattern is to keep recoverable validation feedback in local/private signals:

```json
{
  "_validation": {
    "form": "Please fix the highlighted fields",
    "email": "Email is invalid"
  }
}
```

Return the patch with normal response helpers:

```ts
return reply.signals(validationPayload(error))
```

Keep expected validation/domain failures local to the handler so it is obvious which UI patch they produce. Use app-level middleware for generic decode/security/fatal failures.

Next: [Realtime streams](realtime.md). Related: [Signals](signals.md), [Security](security.md).
