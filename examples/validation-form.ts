import * as z from "zod"
import { ds, h, props, read, render, reply } from "../src/index.js"
import { DATASTAR_CDN } from "./counter.js"

export const ContactFormSchema = z.object({
  name: z.string(),
  email: z.string()
})

export type ContactFormInput = z.infer<typeof ContactFormSchema>
type ContactField = keyof ContactFormInput

const fields: readonly ContactField[] = ["name", "email"]

interface ValidationIssue<Field extends string = string> {
  readonly field?: Field
  readonly message: string
}

class FormValidationError<Field extends string = string> extends Error {
  readonly _tag = "FormValidationError"

  constructor(
    readonly issues: readonly ValidationIssue<Field>[],
    message = "Validation failed"
  ) {
    super(message)
  }
}

type ValidationSignalPayload = {
  readonly _validation: Readonly<Record<string, string | null>>
}

const validationSignalPayload = <Field extends string>(
  error: FormValidationError<Field>
): ValidationSignalPayload => {
  const validation: Record<string, string | null> = { form: error.message }

  for (const issue of error.issues) {
    validation[issue.field ?? "form"] = issue.message
  }

  return { _validation: validation }
}

const clearValidationSignalPayload = <Field extends string>(
  ...fields: readonly Field[]
): ValidationSignalPayload => {
  const validation: Record<string, null> = { form: null }
  for (const field of fields) {
    validation[field] = null
  }
  return { _validation: validation }
}

const validationSignalsResponse = <Field extends string>(
  error: FormValidationError<Field>
): Response => reply.signals(validationSignalPayload(error))

const validateContact = (input: ContactFormInput): ContactFormInput => {
  const issues: Array<ValidationIssue<ContactField>> = []

  if (input.name.trim().length === 0) {
    issues.push({ field: "name", message: "Name is required" })
  }

  if (!input.email.includes("@")) {
    issues.push({ field: "email", message: "Email must contain @" })
  }

  if (issues.length > 0) {
    throw new FormValidationError(issues, "Please fix the highlighted fields")
  }

  return input
}

export const contactFormNode = () => {
  const name = ds.signal<string, "name">("name")
  const email = ds.signal<string, "email">("email")
  const nameError = ds.local<string, "validation.name">("validation.name")
  const emailError = ds.local<string, "validation.email">("validation.email")
  const formError = ds.local<string, "validation.form">("validation.form")

  return h(
    "main",
    { id: "contact-page" },
    h(
      "form",
      props(
        { id: "contact-form" },
        ds.dataSignals({ name: "", email: "" }, { ifMissing: true }),
        ds.dataSignal("_validation.form", "", { ifMissing: true }),
        ds.dataSignal("_validation.name", "", { ifMissing: true }),
        ds.dataSignal("_validation.email", "", { ifMissing: true }),
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
}

export const contactFormView = (): string => render(contactFormNode())

export const contactFormPage = (): Response =>
  reply.page({
    head: h("script", { type: "module", src: DATASTAR_CDN }),
    body: contactFormNode()
  })

export const submitContact = async (request: Request): Promise<Response> => {
  try {
    const input = await read.signals(request, ContactFormSchema)
    const valid = validateContact(input)

    return reply.patch(
      h("div", { id: "contact-result", role: "status" }, `Saved ${valid.name} <${valid.email}>`),
      { selector: "#contact-result", mode: "outer" }
    )
  } catch (error) {
    if (error instanceof FormValidationError) {
      return validationSignalsResponse(error)
    }

    if (error instanceof read.SignalParseError || error instanceof read.SignalValidationError) {
      return new Response("Invalid request input", { status: 400 })
    }

    throw error
  }
}

export const clearContactValidation = (): Response =>
  validationSignalsResponse(new FormValidationError([], ""))

export const contactSuccessSignals = () => clearValidationSignalPayload(...fields)

export const handle = (request: Request): Response | Promise<Response> => {
  const url = new URL(request.url)
  if (request.method === "GET" && url.pathname === "/") {
    return contactFormPage()
  }
  if (request.method === "POST" && url.pathname === "/contact") {
    return submitContact(request)
  }
  return new Response("Not Found", { status: 404 })
}
