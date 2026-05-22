# Validation and errors

Schema validation is app-owned. Datastar Kit does not generate signal contracts from schemas; author browser signal state with `ds.state(...)` or the lower-level signal helpers, decode Datastar's signal transport with `read.signals(request)`, then validate the decoded state with the schema library your app already uses.

## Decode, then validate

Use `read.signals(request)` for Datastar transport decoding, then call Zod, Valibot, ArkType, Effect Schema, or any other validator directly:

```tsx
import { z } from "zod"
import { ds, read, reply } from "datastar-kit"

const ContactSchema = z.object({
  name: z.string(),
  email: z.string().email()
})

const contact = ds.state({
  name: "",
  email: "",
  _validation: { email: "" }
})

const form = (
  <form {...contact.attrs()}>
    <input name="name" {...ds.bind(contact.$.name)} />
    <input name="email" {...ds.bind(contact.$.email)} />
    <small {...ds.text(contact.$._validation.email)} />
  </form>
)

async function submit(request: Request): Promise<Response> {
  const input = ContactSchema.parse(await read.signals(request))
  return reply.signals(contact.patch({ email: input.email.trim(), _validation: { email: "" } }))
}
```

This keeps Datastar Kit focused on Datastar's request format and keeps validator-specific error objects available to application code. With Zod, `ContactSchema.parse(...)` returns `z.output<typeof ContactSchema>` and throws `ZodError`; `safeParse(...)` gives the same type inference without throwing.

For recoverable form errors, prefer `safeParse(...)` so the handler can return Datastar patches:

```ts
const result = ContactSchema.safeParse(await read.signals(request))

if (!result.success) {
  const { fieldErrors } = z.flattenError(result.error)
  return reply.signals(contact.patch({ _validation: { email: fieldErrors.email?.[0] ?? "" } }))
}

const input = result.data
```

## Error categories

Recoverable user-facing errors should usually be returned as successful Datastar responses so the browser runtime applies the UI update. Do not rely on non-`200` response bodies to patch the page.

- **Validation errors** — input is syntactically valid enough to understand, but fails form/domain validation. Return `200` Datastar patches near the relevant fields.
- **Domain/action errors** — the action cannot complete. Return a predictable UI patch if the current Datastar action should update the page, otherwise return an ordinary status response.
- **Decode errors** — malformed JSON signals or non-object signal payloads. These can map to `400` unless a handler deliberately converts them to UI patches.
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
