import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"

export class SignalJsonError {
  readonly _tag = "SignalJsonError"

  constructor(
    readonly raw: string,
    readonly cause: unknown
  ) {}
}

export const DATASTAR_REQUEST_HEADER = "datastar-request"

export const isDatastarRequest = (request: Request): boolean =>
  request.headers.get(DATASTAR_REQUEST_HEADER)?.toLowerCase() === "true"

export const waitForAbortSignal = (signal: AbortSignal): Effect.Effect<void> => {
  if (signal.aborted) {
    return Effect.void
  }

  return Effect.callback<void>((resume) => {
    const onAbort = () => resume(Effect.void)
    signal.addEventListener("abort", onAbort, { once: true })
    return Effect.sync(() => signal.removeEventListener("abort", onAbort))
  })
}

export const waitForRequestAbort = (request: Request): Effect.Effect<void> => waitForAbortSignal(request.signal)

export const abortSignalReason = (signal: AbortSignal): Effect.Effect<unknown> =>
  waitForAbortSignal(signal).pipe(Effect.map(() => signal.reason))

export const requestAbortReason = (request: Request): Effect.Effect<unknown> => abortSignalReason(request.signal)

const methodsWithQuerySignals = new Set(["GET", "DELETE"])

export const rawSignalsFromRequest = (request: Request): Effect.Effect<string, never> =>
  Effect.promise(async () => {
    if (methodsWithQuerySignals.has(request.method.toUpperCase())) {
      return new URL(request.url).searchParams.get("datastar") ?? "{}"
    }

    const body = await request.text()
    return body.length === 0 ? "{}" : body
  })

export const parseSignalsJson = (raw: string): Effect.Effect<unknown, SignalJsonError> =>
  Effect.try({
    try: () => JSON.parse(raw) as unknown,
    catch: (cause) => new SignalJsonError(raw, cause)
  })

export const readSignals = <A, R>(
  request: Request,
  schema: Schema.Decoder<A, R>
): Effect.Effect<A, SignalJsonError | Schema.SchemaError, R> =>
  rawSignalsFromRequest(request).pipe(
    Effect.flatMap(parseSignalsJson),
    Effect.flatMap(Schema.decodeUnknownEffect(schema))
  )

export type QueryValue = string | ReadonlyArray<string>
export type QueryObject = Readonly<Record<string, QueryValue>>

export const queryFromRequest = (request: Request): QueryObject => {
  const result: Record<string, QueryValue> = {}

  new URL(request.url).searchParams.forEach((value, key) => {
    const existing = result[key]
    if (existing === undefined) {
      result[key] = value
    } else {
      const existingValues = typeof existing === "string" ? [existing] : existing
      result[key] = [...existingValues, value]
    }
  })

  return result
}

export const readQuery = <A, R>(
  request: Request,
  schema: Schema.Decoder<A, R>
): Effect.Effect<A, Schema.SchemaError, R> =>
  Schema.decodeUnknownEffect(schema)(queryFromRequest(request))
