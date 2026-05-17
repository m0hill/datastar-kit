import * as Effect from "effect/Effect"
import * as ParseResult from "effect/ParseResult"
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

export const readSignals = <A, I, R>(
  request: Request,
  schema: Schema.Schema<A, I, R>
): Effect.Effect<A, SignalJsonError | ParseResult.ParseError, R> =>
  rawSignalsFromRequest(request).pipe(
    Effect.flatMap(parseSignalsJson),
    Effect.flatMap(Schema.decodeUnknown(schema))
  )
