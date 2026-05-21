# Signal validation without contracts

The Web Standards branch intentionally removes schema-derived signal contracts from core. Signals are authored directly with `ds.signal(...)` and `ds.dataSignals(...)`; request payloads can be read without schema validation using `read.signals(request)` or validated at the boundary with `read.signals(request, schema)`.

```tsx
import { z } from "zod"
import { ds, read, reply } from "datastar-kit"

const ContactSchema = z.object({
  name: z.string(),
  email: z.string()
})

const name = ds.signal<string>("name")
const email = ds.signal<string>("email")

const form = (
  <form {...ds.dataSignals({ name: "", email: "" }, { ifMissing: true })}>
    <input name="name" {...ds.bind(name)} />
    <input name="email" {...ds.bind(email)} />
  </form>
)

async function submit(request: Request): Promise<Response> {
  const input = await read.signals(request, ContactSchema)
  return reply.signals({ email: input.email.trim() })
}
```

This keeps core small and avoids coupling signal authoring to a specific validation library. Standard Schema remains available when request-boundary type inference and validator portability are useful.
