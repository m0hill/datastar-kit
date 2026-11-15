import type { StandardSchemaV1 } from "./standard-schema.js"
import type { SignalState } from "./types.js"

/**
 * Error thrown when a Datastar signal payload cannot be parsed as JSON.
 */
export class SignalParseError extends Error {
  /**
   * @param input The raw signal payload that failed to parse.
   * @param options Error options forwarded to the native `Error` constructor.
   */
  constructor(
    readonly input: string,
    options: { readonly cause?: unknown } = {}
  ) {
    super("Invalid Datastar signal JSON", options)
  }
}

/**
 * Error thrown when parsed Datastar signals are not a JSON object signal tree.
 */
export class SignalShapeError extends Error {
  /**
   * @param input Parsed JSON payload with an invalid signal-state shape.
   */
  constructor(readonly input: unknown) {
    super("Datastar signals must be a JSON object")
  }
}

/**
 * Keeps Datastar transport details private so callers work with parsed signal state.
 */
const rawSignals = async (request: Request): Promise<string> => {
  const method = request.method.toUpperCase()
  if (method === "GET" || method === "DELETE") {
    return new URL(request.url).searchParams.get("datastar") ?? "{}"
  }

  const body = await request.text()
  return body.length === 0 ? "{}" : body
}

/**
 * Parses Datastar signals from a request.
 *
 * @param request Native request received by a Datastar action handler.
 * @returns Parsed Datastar signal state.
 * @throws {@link SignalParseError} When the Datastar signal payload is not valid JSON.
 * @throws {@link SignalShapeError} When the parsed payload is not a JSON object signal tree.
 */
export async function signals(request: Request): Promise<SignalState> {
  const raw = await rawSignals(request)
  let input: SignalState
  try {
    input = JSON.parse(raw)
  } catch (cause) {
    throw new SignalParseError(raw, { cause })
  }

  // Valid JSON text that starts with "{" is an object; application schemas own anything deeper.
  if (!raw.trimStart().startsWith("{")) {
    throw new SignalShapeError(input)
  }

  return input
}

/**
 * Decodes Datastar signals from a request and validates them with any Standard Schema validator.
 *
 * @param request Native request received by a Datastar action handler.
 * @param schema Any Standard Schema validator, such as a Zod, Valibot, or ArkType schema.
 * @returns The schema's result: the typed output as `value`, or its `issues`.
 * @throws {@link SignalParseError} When the Datastar signal payload is not valid JSON.
 * @throws {@link SignalShapeError} When the parsed payload is not a JSON object signal tree.
 */
export async function validate<Schema extends StandardSchemaV1>(
  request: Request,
  schema: Schema
): Promise<StandardSchemaV1.Result<StandardSchemaV1.InferOutput<Schema>>> {
  return schema["~standard"].validate(await signals(request))
}

/** Validation messages grouped by path, as returned by `flattenIssues()`. */
export interface FlattenedIssues {
  /** Messages from issues with no path. */
  readonly form: string[]
  /** Messages keyed by dot path, such as `"email"`, `"address.city"`, or `"tags.1"`. */
  readonly fields: Partial<Record<string, string[]>>
}

const dotPath = (issue: StandardSchemaV1.Issue): string | undefined =>
  issue.path?.length
    ? issue.path
        .map((segment) => String(segment instanceof Object ? segment.key : segment))
        .join(".")
    : undefined

/**
 * Groups Standard Schema issues by dot path, in the shape of Zod's `flattenError`.
 *
 * @param issues Issues from `read.validate` or any Standard Schema validator.
 * @returns Messages grouped into `form` and `fields`, in issue order.
 */
export const flattenIssues = (issues: readonly StandardSchemaV1.Issue[]): FlattenedIssues => {
  const form: string[] = []
  const fields: Partial<Record<string, string[]>> = {}
  for (const issue of issues) {
    const path = dotPath(issue)
    if (path === undefined) form.push(issue.message)
    else (fields[path] ??= []).push(issue.message)
  }
  return { form, fields }
}
