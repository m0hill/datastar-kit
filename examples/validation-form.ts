import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import type * as Scope from "effect/Scope"
import { contract, ds, h, props, read, render, reply } from "../src/index.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

export const ContactForm = contract.signals(
  Schema.Struct({
    name: Schema.String,
    email: Schema.String
  })
)

type ContactField = keyof typeof ContactForm.schema.Type

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
): HttpServerResponse.HttpServerResponse =>
  reply.signals(validationSignalPayload(error))

const validateContact = (input: typeof ContactForm.schema.Type): Effect.Effect<typeof input, FormValidationError<ContactField>> => {
  const issues: Array<ValidationIssue<ContactField>> = []

  if (input.name.trim().length === 0) {
    issues.push({ field: "name", message: "Name is required" })
  }

  if (!input.email.includes("@")) {
    issues.push({ field: "email", message: "Email must contain @" })
  }

  return issues.length === 0
    ? Effect.succeed(input)
    : Effect.fail(new FormValidationError(issues, "Please fix the highlighted fields"))
}

export const contactFormNode = () => {
  const s = ContactForm.$
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
        ContactForm.initial({ name: "", email: "" }, { ifMissing: true }),
        ds.dataSignal("_validation.form", "", { ifMissing: true }),
        ds.dataSignal("_validation.name", "", { ifMissing: true }),
        ds.dataSignal("_validation.email", "", { ifMissing: true }),
        ds.on("submit", ds.post("/contact"), { prevent: true })
      ),
      h("p", props({ id: "form-error", role: "alert" }, ds.text(formError))),
      h("label", {}, "Name", h("input", props({ name: "name" }, ds.bind(s.name)))),
      h("p", props({ id: "name-error" }, ds.text(nameError))),
      h("label", {}, "Email", h("input", props({ name: "email", type: "email" }, ds.bind(s.email)))),
      h("p", props({ id: "email-error" }, ds.text(emailError))),
      h("button", { type: "submit" }, "Save")
    ),
    h("div", { id: "contact-result" })
  )
}

export const contactFormView = (): string => render(contactFormNode())

export const contactFormPage = (): HttpServerResponse.HttpServerResponse =>
  reply.page({
    head: h("script", { type: "module", src: DATASTAR_CDN }),
    body: contactFormNode()
  })

const submitContactInner = Effect.gen(function*() {
  const input = yield* read.signals(ContactForm.schema)
  const valid = yield* validateContact(input)

  return reply.patch(
    h("div", { id: "contact-result", role: "status" }, `Saved ${valid.name} <${valid.email}>`),
    { selector: "#contact-result", mode: "outer" }
  )
})

const hasTag = (error: unknown, tag: string): boolean =>
  typeof error === "object" && error !== null && "_tag" in error && error._tag === tag

export const submitContact = submitContactInner.pipe(
  Effect.matchEffect({
    onFailure: (error) => {
      if (error instanceof FormValidationError) {
        return Effect.succeed(validationSignalsResponse(error))
      }

      if (hasTag(error, "SchemaError")) {
        return Effect.succeed(HttpServerResponse.text("Invalid request input", { status: 400 }))
      }

      return Effect.fail(error)
    },
    onSuccess: Effect.succeed
  })
)

export const clearContactValidation = (): HttpServerResponse.HttpServerResponse =>
  validationSignalsResponse(new FormValidationError([], ""))

export const contactSuccessSignals = () => clearValidationSignalPayload(...fields)

export const app: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  unknown,
  Scope.Scope | HttpServerRequest.HttpServerRequest
> = Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
  HttpRouter.route("GET", "/", contactFormPage()),
  HttpRouter.route("POST", "/contact", submitContact)
])))
