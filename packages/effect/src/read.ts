import { read as core, type SignalState } from "datastar-kit"
import { Data, Effect, Schema, SchemaIssue } from "effect"
import { HttpServerRequest, type HttpServerError } from "effect/http"

/** Error when the request's Datastar signals are not JSON, or not a JSON object. */
export class SignalReadError extends Data.TaggedError("SignalReadError")<{
  readonly cause: core.SignalParseError | core.SignalShapeError
}> {}

/**
 * Reads the current request's Datastar signals. The body is read through Effect, so other
 * readers of the same request still work.
 *
 * Fails with `SignalReadError`, or with `HttpServerError` when the body cannot be read.
 */
export const signals: Effect.Effect<
  SignalState,
  SignalReadError | HttpServerError.HttpServerError,
  HttpServerRequest.HttpServerRequest
> = Effect.gen(function* () {
  const request = yield* HttpServerRequest.HttpServerRequest
  const body = yield* request.text
  return yield* Effect.try({
    try: () => core.parseSignals({ method: request.method, url: request.url, body }),
    catch: (cause) => {
      if (cause instanceof core.SignalParseError || cause instanceof core.SignalShapeError) {
        return new SignalReadError({ cause })
      }
      throw cause
    }
  })
})

/**
 * Reads the current request's Datastar signals and decodes them with an Effect schema.
 *
 * @param schema Effect schema for the signal state. Decoding reports every issue.
 * @returns The decoded value. Fails like `signals`, or with `SchemaError`.
 */
export const decode = <S extends Schema.Constraint>(
  schema: S
): Effect.Effect<
  S["Type"],
  SignalReadError | HttpServerError.HttpServerError | Schema.SchemaError,
  HttpServerRequest.HttpServerRequest | S["DecodingServices"]
> => Effect.flatMap(signals, Schema.decodeUnknownEffect(schema, { errors: "all" }))

const standardIssues = SchemaIssue.makeFormatterStandardSchemaV1()

/** Groups a `SchemaError`'s messages by dot path, in the shape of Zod's `flattenError`. */
export const flattenError = (error: Schema.SchemaError): core.FlattenedIssues =>
  core.flattenIssues(standardIssues(error.issue).issues)
