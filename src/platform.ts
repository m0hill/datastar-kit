import * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import type * as Path from "effect/Path"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerError from "effect/unstable/http/HttpServerError"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import type * as Multipart from "effect/unstable/http/Multipart"

export class SignalJsonError {
  readonly _tag = "SignalJsonError"

  constructor(
    readonly raw: string,
    readonly cause: unknown
  ) {}
}

export const DATASTAR_REQUEST_HEADER = "datastar-request"

export const isDatastarRequest = (request: HttpServerRequest.HttpServerRequest): boolean =>
  request.headers[DATASTAR_REQUEST_HEADER]?.toLowerCase() === "true"

export const parseSignalsJson = (raw: string): Effect.Effect<unknown, SignalJsonError> =>
  Effect.try({
    try: () => JSON.parse(raw) as unknown,
    catch: (cause) => new SignalJsonError(raw, cause)
  })

export const platformRouter = <Routes extends ReadonlyArray<HttpRouter.Route<unknown, unknown>>>(
  ...routes: Routes
): Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  HttpServerError.HttpServerError | HttpRouter.Route.Error<Routes[number]>,
  Scope.Scope | HttpServerRequest.HttpServerRequest | HttpRouter.Route.Context<Routes[number]>
> =>
  Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll(routes))) as Effect.Effect<
    HttpServerResponse.HttpServerResponse,
    HttpServerError.HttpServerError | HttpRouter.Route.Error<Routes[number]>,
    Scope.Scope | HttpServerRequest.HttpServerRequest | HttpRouter.Route.Context<Routes[number]>
  >

const platformMethodsWithQuerySignals = new Set(["GET", "DELETE"])

export const platformRawSignalsFromRequest = (
  request: HttpServerRequest.HttpServerRequest
): Effect.Effect<string, HttpServerError.HttpServerError> => {
  if (platformMethodsWithQuerySignals.has(request.method)) {
    return Effect.succeed(new URL(request.url, "http://localhost").searchParams.get("datastar") ?? "{}")
  }

  return request.text.pipe(Effect.map((body) => body.length === 0 ? "{}" : body))
}

export const platformReadSignalsFromRequest = <A, R>(
  request: HttpServerRequest.HttpServerRequest,
  schema: Schema.Decoder<A, R>
): Effect.Effect<A, HttpServerError.HttpServerError | SignalJsonError | Schema.SchemaError, R> =>
  platformRawSignalsFromRequest(request).pipe(
    Effect.flatMap(parseSignalsJson),
    Effect.flatMap(Schema.decodeUnknownEffect(schema))
  )

export const platformReadSignals = <A, R>(
  schema: Schema.Decoder<A, R>
): Effect.Effect<A, HttpServerError.HttpServerError | SignalJsonError | Schema.SchemaError, R | HttpServerRequest.HttpServerRequest> =>
  HttpServerRequest.HttpServerRequest.pipe(
    Effect.flatMap((request) => platformReadSignalsFromRequest(request, schema))
  )

export type QueryValue = string | ReadonlyArray<string>
export type QueryObject = Readonly<Record<string, QueryValue>>

export const platformQueryFromRequest = (request: HttpServerRequest.HttpServerRequest): QueryObject => {
  const result: Record<string, QueryValue> = {}

  new URL(request.url, "http://localhost").searchParams.forEach((value, key) => {
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

export const platformReadQueryFromRequest = <A, R>(
  request: HttpServerRequest.HttpServerRequest,
  schema: Schema.Decoder<A, R>
): Effect.Effect<A, Schema.SchemaError, R> =>
  Schema.decodeUnknownEffect(schema)(platformQueryFromRequest(request))

export const platformReadQuery = <A, R>(
  schema: Schema.Decoder<A, R>
): Effect.Effect<A, Schema.SchemaError, R | HttpServerRequest.HttpServerRequest> =>
  HttpServerRequest.HttpServerRequest.pipe(
    Effect.flatMap((request) => platformReadQueryFromRequest(request, schema))
  )

export type UrlEncodedFormInput = Readonly<Record<string, string | ReadonlyArray<string> | undefined>>

export const platformReadUrlEncodedFormFromRequest = <A, I extends UrlEncodedFormInput, RD, RE>(
  request: HttpServerRequest.HttpServerRequest,
  schema: Schema.Codec<A, I, RD, RE>
): Effect.Effect<A, HttpServerError.HttpServerError | Schema.SchemaError, RD> =>
  HttpServerRequest.schemaBodyUrlParams(schema).pipe(
    Effect.provideService(HttpServerRequest.HttpServerRequest, request)
  )

export const platformReadUrlEncodedForm = <A, I extends UrlEncodedFormInput, RD, RE>(
  schema: Schema.Codec<A, I, RD, RE>
): Effect.Effect<A, HttpServerError.HttpServerError | Schema.SchemaError, RD | HttpServerRequest.HttpServerRequest> =>
  HttpServerRequest.schemaBodyUrlParams(schema)

export const platformReadFormFromRequest = <A, I extends Partial<Multipart.Persisted>, RD, RE>(
  request: HttpServerRequest.HttpServerRequest,
  schema: Schema.Codec<A, I, RD, RE>
): Effect.Effect<
  A,
  Multipart.MultipartError | HttpServerError.HttpServerError | Schema.SchemaError,
  RD | Scope.Scope | FileSystem.FileSystem | Path.Path
> =>
  HttpServerRequest.schemaBodyForm(schema).pipe(
    Effect.provideService(HttpServerRequest.HttpServerRequest, request)
  )

export const platformReadForm = <A, I extends Partial<Multipart.Persisted>, RD, RE>(
  schema: Schema.Codec<A, I, RD, RE>
): Effect.Effect<
  A,
  Multipart.MultipartError | HttpServerError.HttpServerError | Schema.SchemaError,
  RD | HttpServerRequest.HttpServerRequest | Scope.Scope | FileSystem.FileSystem | Path.Path
> =>
  HttpServerRequest.schemaBodyForm(schema)

export const platformReadMultipartFromRequest = <A, I extends Partial<Multipart.Persisted>, RD, RE>(
  request: HttpServerRequest.HttpServerRequest,
  schema: Schema.Codec<A, I, RD, RE>
): Effect.Effect<A, Multipart.MultipartError | Schema.SchemaError, RD | Scope.Scope | FileSystem.FileSystem | Path.Path> =>
  HttpServerRequest.schemaBodyMultipart(schema).pipe(
    Effect.provideService(HttpServerRequest.HttpServerRequest, request)
  )

export const platformReadMultipart = <A, I extends Partial<Multipart.Persisted>, RD, RE>(
  schema: Schema.Codec<A, I, RD, RE>
): Effect.Effect<
  A,
  Multipart.MultipartError | Schema.SchemaError,
  RD | HttpServerRequest.HttpServerRequest | Scope.Scope | FileSystem.FileSystem | Path.Path
> =>
  HttpServerRequest.schemaBodyMultipart(schema)

export type PlatformResponseOptions = HttpServerResponse.Options
