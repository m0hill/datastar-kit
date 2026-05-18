import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as HttpServerError from "effect/unstable/http/HttpServerError"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"

const methodsWithQuerySignals = new Set(["GET", "DELETE"])

const rawSignals = (
  request: HttpServerRequest.HttpServerRequest
): Effect.Effect<string, HttpServerError.HttpServerError> => {
  if (methodsWithQuerySignals.has(request.method)) {
    return Effect.succeed(new URL(request.url, "http://localhost").searchParams.get("datastar") ?? "{}")
  }

  return request.text.pipe(Effect.map((body) => body.length === 0 ? "{}" : body))
}

export const signals = <A, R>(
  schema: Schema.Decoder<A, R>
): Effect.Effect<A, HttpServerError.HttpServerError | Schema.SchemaError, R | HttpServerRequest.HttpServerRequest> =>
  HttpServerRequest.HttpServerRequest.pipe(
    Effect.flatMap(rawSignals),
    Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(schema)))
  )
