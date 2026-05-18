import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as HttpServerError from "effect/unstable/http/HttpServerError"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import type * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import {
  dataSignals,
  fetchAction,
  queryUrl,
  signals,
  type Expr,
  type FetchOptions,
  type HttpMethod,
  type QueryParamInput,
  type SignalRecord
} from "./datastar.js"
import type { Attributes } from "./html.js"
import {
  datastarPatchSignalsResponse,
  platformReadQuery,
  platformReadQueryFromRequest,
  platformReadSignals,
  platformReadSignalsFromRequest,
  type DatastarBodyResponseOptions,
  type SignalJsonError
} from "./platform.js"
import type { SignalDecoderValue } from "./runtime.js"
import type { JsonObject, JsonValue, PatchSignalsOptions } from "./sse.js"

export type SignalPatchValue<T> = T extends readonly (infer Item)[]
  ? readonly SignalPatchValue<Item>[] | null
  : T extends object
    ? { readonly [Key in keyof T]?: SignalPatchValue<T[Key]> } | null
    : T | null

export type SignalPatch<Shape extends object> = {
  readonly [Key in keyof Shape]?: SignalPatchValue<Shape[Key]>
}

export interface SignalContract<Name extends string, Shape extends object, R> {
  readonly name: Name
  readonly schema: Schema.Decoder<Shape, R>
  readonly signals: SignalRecord<Shape>
  readonly initial: (values: Shape, options?: { readonly ifMissing?: boolean }) => Attributes
  readonly read: Effect.Effect<
    Shape,
    HttpServerError.HttpServerError | SignalJsonError | Schema.SchemaError,
    R | HttpServerRequest.HttpServerRequest
  >
  readonly readFromRequest: (
    request: HttpServerRequest.HttpServerRequest
  ) => Effect.Effect<Shape, HttpServerError.HttpServerError | SignalJsonError | Schema.SchemaError, R>
  readonly decode: (
    decoder: SignalDecoderValue
  ) => Effect.Effect<Shape, HttpServerError.HttpServerError | SignalJsonError | Schema.SchemaError, R>
  readonly patch: (values: SignalPatch<Shape>) => SignalPatch<Shape>
  readonly patchResponse: (
    values: SignalPatch<Shape>,
    options?: PatchSignalsOptions,
    responseOptions?: DatastarBodyResponseOptions
  ) => HttpServerResponse.HttpServerResponse
}

export const defineSignals = <Name extends string, Shape extends object, R>(
  name: Name,
  schema: Schema.Decoder<Shape, R>
): SignalContract<Name, Shape, R> => ({
  name,
  schema,
  signals: signals<Shape>(),
  initial: (values, options) => dataSignals(values as JsonObject, options),
  read: platformReadSignals(schema),
  readFromRequest: (request) => platformReadSignalsFromRequest(request, schema),
  decode: (decoder) => decoder.decode(schema),
  patch: (values) => values,
  patchResponse: (values, options, responseOptions) =>
    datastarPatchSignalsResponse(values as JsonObject, options, responseOptions)
})

export type QueryInput<Shape extends object> = {
  readonly [Key in keyof Shape]: QueryParamInput
}

export interface ActionContract<Name extends string, Method extends HttpMethod, Path extends string> {
  readonly name: Name
  readonly method: Method
  readonly path: Path
  readonly action: (options?: FetchOptions) => Expr<void>
}

export const defineAction = <Name extends string, Method extends HttpMethod, Path extends string>(options: {
  readonly name: Name
  readonly method: Method
  readonly path: Path
}): ActionContract<Name, Method, Path> => ({
  ...options,
  action: (fetchOptions) => fetchAction(options.method, options.path, fetchOptions)
})

export interface QueryActionContract<Name extends string, Method extends HttpMethod, Path extends string, Query extends object, R>
  extends ActionContract<Name, Method, Path>
{
  readonly querySchema: Schema.Decoder<Query, R>
  readonly url: (query: QueryInput<Query>) => Expr<string>
  readonly actionWithQuery: (query: QueryInput<Query>, options?: FetchOptions) => Expr<void>
  readonly readQuery: Effect.Effect<Query, Schema.SchemaError, R | HttpServerRequest.HttpServerRequest>
  readonly readQueryFromRequest: (request: HttpServerRequest.HttpServerRequest) => Effect.Effect<Query, Schema.SchemaError, R>
}

export const defineQueryAction = <Name extends string, Method extends HttpMethod, Path extends string, Query extends object, R>(options: {
  readonly name: Name
  readonly method: Method
  readonly path: Path
  readonly querySchema: Schema.Decoder<Query, R>
}): QueryActionContract<Name, Method, Path, Query, R> => ({
  ...defineAction(options),
  querySchema: options.querySchema,
  url: (query) => queryUrl(options.path, query as Readonly<Record<string, QueryParamInput>>),
  actionWithQuery: (query, fetchOptions) => fetchAction(options.method, queryUrl(options.path, query as Readonly<Record<string, QueryParamInput>>), fetchOptions),
  readQuery: platformReadQuery(options.querySchema),
  readQueryFromRequest: (request) => platformReadQueryFromRequest(request, options.querySchema)
})

export const signalPatchJson = <Shape extends object>(patch: SignalPatch<Shape>): JsonObject => patch as JsonObject
export const signalPatchValue = <T>(value: SignalPatchValue<T>): JsonValue | null => value as JsonValue | null
