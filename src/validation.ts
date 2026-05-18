import * as Effect from "effect/Effect"
import type * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { h, type Child } from "./html.js"
import { datastarPatchElementsResponse, datastarPatchSignalsResponse, type DatastarBodyResponseOptions } from "./platform.js"
import type { JsonObject, PatchElementsOptions, PatchSignalsOptions } from "./sse.js"

export interface ValidationIssue<Field extends string = string> {
  readonly field?: Field
  readonly message: string
}

export class FormValidationError<Field extends string = string> extends Error {
  readonly _tag = "FormValidationError"

  constructor(
    readonly issues: readonly ValidationIssue<Field>[],
    message = "Validation failed"
  ) {
    super(message)
  }
}

export class ActionError extends Error {
  readonly _tag = "ActionError"

  constructor(
    message: string,
    readonly code = "ACTION_FAILED"
  ) {
    super(message)
  }
}

export type ValidationSignalPayload<Field extends string = string> = {
  readonly _validation: Partial<Record<Field | "form", string | null>>
}

export const validationSignalPayload = <Field extends string>(
  error: FormValidationError<Field>
): ValidationSignalPayload<Field> => {
  const validation: Record<string, string | null> = { form: error.message }

  for (const issue of error.issues) {
    validation[issue.field ?? "form"] = issue.message
  }

  return { _validation: validation as Partial<Record<Field | "form", string | null>> }
}

export const clearValidationSignalPayload = <Field extends string>(
  ...fields: readonly Field[]
): ValidationSignalPayload<Field> => {
  const validation: Record<string, null> = { form: null }
  for (const field of fields) {
    validation[field] = null
  }
  return { _validation: validation as Partial<Record<Field | "form", null>> }
}

export const validationSignalsResponse = <Field extends string>(
  error: FormValidationError<Field>,
  options?: PatchSignalsOptions,
  responseOptions?: DatastarBodyResponseOptions
): HttpServerResponse.HttpServerResponse =>
  datastarPatchSignalsResponse(validationSignalPayload(error) as JsonObject, options, responseOptions)

export const clearValidationSignalsResponse = <Field extends string>(
  fields: readonly Field[],
  options?: PatchSignalsOptions,
  responseOptions?: DatastarBodyResponseOptions
): HttpServerResponse.HttpServerResponse =>
  datastarPatchSignalsResponse(clearValidationSignalPayload(...fields) as JsonObject, options, responseOptions)

export const validationSummaryNode = <Field extends string>(
  error: FormValidationError<Field>,
  attrs: Readonly<Record<string, string | number | boolean | null | undefined>> = { id: "form-errors", role: "alert" }
): Child =>
  h(
    "div",
    attrs,
    h("p", {}, error.message),
    h(
      "ul",
      {},
      ...error.issues.map((issue) => h("li", {}, issue.field === undefined ? issue.message : `${issue.field}: ${issue.message}`))
    )
  )

export const validationSummaryResponse = <Field extends string>(
  error: FormValidationError<Field>,
  options: PatchElementsOptions = { selector: "#form-errors", mode: "outer" },
  responseOptions?: DatastarBodyResponseOptions
): HttpServerResponse.HttpServerResponse =>
  datastarPatchElementsResponse(validationSummaryNode(error), options, responseOptions)

export const actionErrorNode = (
  error: ActionError,
  attrs: Readonly<Record<string, string | number | boolean | null | undefined>> = { id: "action-error", role: "alert" }
): Child => h("div", attrs, error.message)

export const actionErrorResponse = (
  error: ActionError,
  options: PatchElementsOptions = { selector: "#action-error", mode: "outer" },
  responseOptions?: DatastarBodyResponseOptions
): HttpServerResponse.HttpServerResponse =>
  datastarPatchElementsResponse(actionErrorNode(error), options, responseOptions)

export const recoverValidation = <R>(
  effect: Effect.Effect<HttpServerResponse.HttpServerResponse, FormValidationError, R>
): Effect.Effect<HttpServerResponse.HttpServerResponse, never, R> =>
  effect.pipe(
    Effect.matchEffect({
      onFailure: (error) => Effect.succeed(validationSignalsResponse(error)),
      onSuccess: Effect.succeed
    })
  )
