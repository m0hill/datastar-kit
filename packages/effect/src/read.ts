import { read as core, type SignalState } from "datastar-kit"
import { Data, Effect, Schema, SchemaIssue } from "effect"
import { HttpServerRequest } from "effect/http"

/** Error when the request body cannot be read or its Datastar signals are not a JSON object. */
export class SignalReadError extends Data.TaggedError("SignalReadError")<{
  readonly cause: unknown
}> {}

// Reuses datastar-kit's reader, which owns where signals live in a request.
const signals: Effect.Effect<SignalState, SignalReadError, HttpServerRequest.HttpServerRequest> =
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const webRequest = yield* HttpServerRequest.toWeb(request).pipe(
      Effect.mapError((cause) => new SignalReadError({ cause }))
    )
    return yield* Effect.tryPromise({
      try: () => core.signals(webRequest),
      catch: (cause) => new SignalReadError({ cause })
    })
  })

/**
 * Reads the current request's Datastar signals and decodes them with an Effect schema.
 *
 * @param schema Effect schema for the signal state. Decoding reports every issue.
 * @returns The decoded value. Fails with `SignalReadError` or `SchemaError`.
 */
export const decode = <S extends Schema.Constraint>(
  schema: S
): Effect.Effect<
  S["Type"],
  SignalReadError | Schema.SchemaError,
  HttpServerRequest.HttpServerRequest | S["DecodingServices"]
> => Effect.flatMap(signals, Schema.decodeUnknownEffect(schema, { errors: "all" }))

const standardIssues = SchemaIssue.makeFormatterStandardSchemaV1()

/** Groups a `SchemaError`'s messages by dot path, as datastar-kit's `read.flattenIssues()` does. */
export const flattenError = (error: Schema.SchemaError): core.FlattenedIssues =>
  core.flattenIssues(standardIssues(error.issue).issues)
