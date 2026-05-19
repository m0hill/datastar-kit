import * as z from "zod"
import { ds, event, h, props, read, reply } from "../src/index.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const ContactFormSchema = z.object({
  name: z.string(),
  email: z.string()
})

type ContactFormInput = z.infer<typeof ContactFormSchema>
type ValidationMessages = Partial<Record<keyof ContactFormInput | "form", string>>

export async function handle(request: Request) {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") {
    const name = ds.signal<string>("name")
    const email = ds.signal<string>("email")
    const formError = ds.local<string>("validation.form")
    const nameError = ds.local<string>("validation.name")
    const emailError = ds.local<string>("validation.email")

    return reply.page({
      head: h("script", { type: "module", src: DATASTAR_CDN }),
      body: h(
        "main",
        { id: "contact-page" },
        h(
          "form",
          props(
            { id: "contact-form" },
            ds.dataSignals({
              name: "",
              email: "",
              _validation: {
                form: "",
                name: "",
                email: ""
              }
            }, { ifMissing: true }),
            ds.on("submit", ds.post("/contact"), { prevent: true })
          ),
          h("p", props({ id: "form-error", role: "alert" }, ds.text(formError))),
          h("label", {}, "Name", h("input", props({ name: "name" }, ds.bind(name)))),
          h("p", props({ id: "name-error" }, ds.text(nameError))),
          h("label", {}, "Email", h("input", props({ name: "email", type: "email" }, ds.bind(email)))),
          h("p", props({ id: "email-error" }, ds.text(emailError))),
          h("button", { type: "submit" }, "Save")
        ),
        h("div", { id: "contact-result" })
      )
    })
  }

  if (request.method === "POST" && url.pathname === "/contact") {
    try {
      const input = await read.signals(request, ContactFormSchema)
      const validation: ValidationMessages = {}

      if (input.name.trim().length === 0) validation.name = "Name is required"
      if (!input.email.includes("@")) validation.email = "Email must contain @"

      if (validation.name !== undefined || validation.email !== undefined) {
        return reply.signals({
          _validation: {
            form: "Please fix the highlighted fields",
            name: validation.name ?? null,
            email: validation.email ?? null
          }
        })
      }

      return reply.stream([
        event.signals({ _validation: { form: null, name: null, email: null } }),
        event.patch(
          h("div", { id: "contact-result", role: "status" }, `Saved ${input.name} <${input.email}>`),
          { selector: "#contact-result" }
        )
      ])
    } catch (error) {
      if (error instanceof read.SignalParseError || error instanceof read.SignalValidationError) {
        return new Response("Invalid request input", { status: 400 })
      }

      throw error
    }
  }

  return new Response("Not Found", { status: 404 })
}
