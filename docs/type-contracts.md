# Signal validation without contracts

The Web Standards branch intentionally removes schema-derived signal contracts from core. Signals are authored directly with `ds.signal(...)` and `ds.dataSignals(...)`, while request payloads are validated at the boundary with `read.signals(request, schema)`.

```ts
import { z } from "zod"
import { ds, h, props, read, reply } from "ts-star"

const ContactSchema = z.object({
  name: z.string(),
  email: z.string()
})

const name = ds.signal<string, "name">("name")
const email = ds.signal<string, "email">("email")

const form = h(
  "form",
  props(ds.dataSignals({ name: "", email: "" }, { ifMissing: true })),
  h("input", props({ name: "name" }, ds.bind(name))),
  h("input", props({ name: "email" }, ds.bind(email)))
)

async function submit(request: Request): Promise<Response> {
  const input = await read.signals(request, ContactSchema)
  return reply.signals({ email: input.email.trim() })
}
```

This keeps core small and avoids coupling signal authoring to a specific validation library. Standard Schema still gives request-boundary type inference and validator portability.
