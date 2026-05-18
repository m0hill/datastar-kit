import * as z from "zod"
import { ds, h, props, read, render, reply, type Child } from "../src/index.js"
import { patchElements, patchSignals } from "../src/sse.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const datastarScript = (): Child => h("script", { type: "module", src: DATASTAR_CDN })
const notFound = (): Response => new Response("Not Found", { status: 404 })

export const ContactFormSchema = z.object({
  name: z.string(),
  email: z.string()
})

export type ContactFormInput = z.infer<typeof ContactFormSchema>
type ContactField = keyof ContactFormInput
type ValidationMessages = Partial<Record<ContactField | "form", string>>

const contact = {
  name: ds.signal<string, "name">("name"),
  email: ds.signal<string, "email">("email")
} as const

const validation = {
  form: ds.local<string, "validation.form">("validation.form"),
  name: ds.local<string, "validation.name">("validation.name"),
  email: ds.local<string, "validation.email">("validation.email")
} as const

const initialSignals = ds.dataSignals({
  name: "",
  email: "",
  _validation: {
    form: "",
    name: "",
    email: ""
  }
}, { ifMissing: true })

const validationPayload = (messages: ValidationMessages = {}) => {
  const next: Record<string, string | null> = {
    form: messages.form ?? null,
    name: messages.name ?? null,
    email: messages.email ?? null
  }

  return { _validation: next }
}

const validationResponse = (messages: ValidationMessages): Response =>
  reply.signals(validationPayload(messages))

const hasValidationMessages = (messages: ValidationMessages): boolean =>
  Object.values(messages).some((message) => message !== undefined && message.length > 0)

const validateContact = (input: ContactFormInput): ValidationMessages => {
  const messages: ValidationMessages = {}

  if (input.name.trim().length === 0) messages.name = "Name is required"
  if (!input.email.includes("@")) messages.email = "Email must contain @"

  return hasValidationMessages(messages)
    ? { form: "Please fix the highlighted fields", ...messages }
    : {}
}

const contactResultNode = (contact: ContactFormInput): Child =>
  h("div", { id: "contact-result", role: "status" }, `Saved ${contact.name} <${contact.email}>`)

const clearValidationEvent = (): string => patchSignals(validationPayload())

const contactResultEvent = (contact: ContactFormInput): string =>
  patchElements(render(contactResultNode(contact)), { selector: "#contact-result" })

export const contactFormNode = (): Child =>
  h(
    "main",
    { id: "contact-page" },
    h(
      "form",
      props(
        { id: "contact-form" },
        initialSignals,
        ds.on("submit", ds.post("/contact"), { prevent: true })
      ),
      h("p", props({ id: "form-error", role: "alert" }, ds.text(validation.form))),
      h("label", {}, "Name", h("input", props({ name: "name" }, ds.bind(contact.name)))),
      h("p", props({ id: "name-error" }, ds.text(validation.name))),
      h("label", {}, "Email", h("input", props({ name: "email", type: "email" }, ds.bind(contact.email)))),
      h("p", props({ id: "email-error" }, ds.text(validation.email))),
      h("button", { type: "submit" }, "Save")
    ),
    h("div", { id: "contact-result" })
  )

export const contactFormView = (): string => render(contactFormNode())

export const contactFormPage = (): Response =>
  reply.page({
    head: datastarScript(),
    body: contactFormNode()
  })

export const submitContact = async (request: Request): Promise<Response> => {
  try {
    const input = await read.signals(request, ContactFormSchema)
    const messages = validateContact(input)

    if (hasValidationMessages(messages)) return validationResponse(messages)

    return reply.stream([
      clearValidationEvent(),
      contactResultEvent(input)
    ])
  } catch (error) {
    if (error instanceof read.SignalParseError || error instanceof read.SignalValidationError) {
      return new Response("Invalid request input", { status: 400 })
    }

    throw error
  }
}

export const clearContactValidation = (): Response =>
  reply.signals(validationPayload())

export const contactSuccessSignals = () => validationPayload()

export const handle = (request: Request): Response | Promise<Response> => {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") return contactFormPage()
  if (request.method === "POST" && url.pathname === "/contact") return submitContact(request)

  return notFound()
}
