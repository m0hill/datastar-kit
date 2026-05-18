import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import type * as Scope from "effect/Scope"
import { defineSignals } from "../src/contracts.js"
import { bind, mergeAttrs, on, post, text, validationDataSignal, validationSignal } from "../src/datastar.js"
import { h, render } from "../src/html.js"
import { platformRouter } from "../src/platform.js"
import * as reply from "../src/reply.js"
import { catchMappedErrors, requestRuntimeLayer, SignalDecoder } from "../src/runtime.js"
import { clearValidationSignalPayload, FormValidationError, validationSignalsResponse, type ValidationIssue } from "../src/validation.js"

export const ContactForm = defineSignals(
  "ContactForm",
  Schema.Struct({
    name: Schema.String,
    email: Schema.String
  })
)

type ContactField = keyof typeof ContactForm.schema.Type

const fields: readonly ContactField[] = ["name", "email"]

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
  const s = ContactForm.signals
  const nameError = validationSignal("name")
  const emailError = validationSignal("email")
  const formError = validationSignal("form")

  return h(
    "main",
    { id: "contact-page" },
    h(
      "form",
      mergeAttrs(
        { id: "contact-form" },
        ContactForm.initial({ name: "", email: "" }, { ifMissing: true }),
        validationDataSignal("form", "", { ifMissing: true }),
        validationDataSignal("name", "", { ifMissing: true }),
        validationDataSignal("email", "", { ifMissing: true }),
        on("submit", post("/contact"), { prevent: true })
      ),
      h("p", mergeAttrs({ id: "form-error", role: "alert" }, text(formError))),
      h("label", {}, "Name", h("input", mergeAttrs({ name: "name" }, bind(s.name)))),
      h("p", mergeAttrs({ id: "name-error" }, text(nameError))),
      h("label", {}, "Email", h("input", mergeAttrs({ name: "email", type: "email" }, bind(s.email)))),
      h("p", mergeAttrs({ id: "email-error" }, text(emailError))),
      h("button", { type: "submit" }, "Save")
    ),
    h("div", { id: "contact-result" })
  )
}

export const contactFormView = (): string => render(contactFormNode())

export const contactFormPage = (): HttpServerResponse.HttpServerResponse =>
  reply.page(contactFormNode())

const submitContactInner = Effect.gen(function*() {
  const decoder = yield* SignalDecoder
  const input = yield* ContactForm.decode(decoder)
  const valid = yield* validateContact(input)

  return reply.patch(
    h("div", { id: "contact-result", role: "status" }, `Saved ${valid.name} <${valid.email}>`),
    { selector: "#contact-result", mode: "outer" }
  )
})

export const submitContact = catchMappedErrors(
  submitContactInner.pipe(
    Effect.matchEffect({
      onFailure: (error) => error instanceof FormValidationError
        ? Effect.succeed(validationSignalsResponse(error))
        : Effect.fail(error),
      onSuccess: Effect.succeed
    })
  )
).pipe(
  Effect.provide(requestRuntimeLayer(), { local: true })
)

export const clearContactValidation = (): HttpServerResponse.HttpServerResponse =>
  validationSignalsResponse(new FormValidationError([], ""))

export const contactSuccessSignals = () => clearValidationSignalPayload(...fields)

export const app: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  unknown,
  Scope.Scope | HttpServerRequest.HttpServerRequest
> = platformRouter(
  HttpRouter.route("GET", "/", contactFormPage()),
  HttpRouter.route("POST", "/contact", submitContact)
)
