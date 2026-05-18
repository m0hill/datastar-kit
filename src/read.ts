import type { StandardSchemaV1 } from "@standard-schema/spec"

export class SignalParseError extends Error {
  readonly _tag = "SignalParseError"

  constructor(
    readonly input: string,
    options: { readonly cause?: unknown } = {}
  ) {
    super("Invalid Datastar signal JSON", options)
  }
}

export class SignalValidationError extends Error {
  readonly _tag = "SignalValidationError"

  constructor(readonly issues: ReadonlyArray<StandardSchemaV1.Issue>) {
    super(issues[0]?.message ?? "Invalid Datastar signals")
  }
}

export const rawSignals = async (request: Request): Promise<string> => {
  const method = request.method.toUpperCase()
  if (method === "GET" || method === "DELETE") {
    return new URL(request.url).searchParams.get("datastar") ?? "{}"
  }

  const body = await request.text()
  return body.length === 0 ? "{}" : body
}

export const signals = async <Schema extends StandardSchemaV1>(
  request: Request,
  schema: Schema
): Promise<StandardSchemaV1.InferOutput<Schema>> => {
  const raw = await rawSignals(request)
  let input: unknown
  try {
    input = JSON.parse(raw)
  } catch (cause) {
    throw new SignalParseError(raw, { cause })
  }

  let result = schema["~standard"].validate(input)
  if (result instanceof Promise) {
    result = await result
  }

  if (result.issues !== undefined) {
    throw new SignalValidationError(result.issues)
  }

  return result.value
}
