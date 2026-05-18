import * as Effect from "effect/Effect"
import type * as FileSystem from "effect/FileSystem"
import type * as Path from "effect/Path"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Headers from "effect/unstable/http/Headers"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerError from "effect/unstable/http/HttpServerError"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import type * as Multipart from "effect/unstable/http/Multipart"
import { render, type Child } from "./html.js"
import type { ElementNamespace, ElementPatchMode } from "./sse.js"
import { eventStream, patchElements, patchSignals, type JsonObject, type PatchElementsOptions, type PatchSignalsOptions } from "./sse.js"

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

const renderPlatformHtml = (content: string | Exclude<Child, string>): string =>
  typeof content === "string" ? content : render(content)

const platformSseHeaders = (headers: Headers.Input | undefined): Headers.Headers => {
  const existing = Headers.fromInput(headers)
  return Headers.fromInput({
    ...existing,
    "cache-control": existing["cache-control"] ?? "no-cache",
    connection: existing.connection ?? "keep-alive"
  })
}

const platformSseOptions = (options: PlatformResponseOptions = {}): PlatformResponseOptions => ({
  ...options,
  contentType: options.contentType ?? "text/event-stream",
  headers: platformSseHeaders(options.headers)
})

export const platformSseResponse = (
  events: ReadonlyArray<string>,
  options?: PlatformResponseOptions
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.text(eventStream(...events), platformSseOptions(options))

export type PlatformEventSource = AsyncIterable<string> | Stream.Stream<string, unknown>

const isPlatformStream = (source: PlatformEventSource): source is Stream.Stream<string, unknown> =>
  "channel" in source

const platformEventSourceStream = (source: PlatformEventSource): Stream.Stream<Uint8Array, unknown> =>
  (isPlatformStream(source) ? source : Stream.fromAsyncIterable(source, (cause) => cause)).pipe(Stream.encodeText)

export const platformEventStreamResponse = (
  events: PlatformEventSource,
  options?: PlatformResponseOptions
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.stream(platformEventSourceStream(events), platformSseOptions(options))

export const platformPatchElementsResponse = (
  elements: string | Exclude<Child, string>,
  options?: PatchElementsOptions,
  responseOptions?: PlatformResponseOptions
): HttpServerResponse.HttpServerResponse =>
  platformSseResponse([patchElements(renderPlatformHtml(elements), options)], responseOptions)

export const platformPatchSignalsResponse = (
  signals: JsonObject | string,
  options?: PatchSignalsOptions,
  responseOptions?: PlatformResponseOptions
): HttpServerResponse.HttpServerResponse =>
  platformSseResponse([patchSignals(signals, options)], responseOptions)

export const platformHtmlResponse = (
  html: string | Exclude<Child, string>,
  options: PlatformResponseOptions = {}
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.text(renderPlatformHtml(html), {
    ...options,
    contentType: options.contentType ?? "text/html; charset=utf-8"
  })

export interface PlatformHtmlPatchResponseOptions extends PlatformResponseOptions {
  readonly selector?: string
  readonly mode?: ElementPatchMode
  readonly namespace?: ElementNamespace
  readonly useViewTransition?: boolean
}

export const platformHtmlPatchResponse = (
  html: string | Exclude<Child, string>,
  options: PlatformHtmlPatchResponseOptions = {}
): HttpServerResponse.HttpServerResponse => {
  const headers = Headers.fromInput(options.headers)
  const datastarHeaders = Headers.fromInput({
    ...headers,
    ...(options.selector === undefined ? {} : { "datastar-selector": options.selector }),
    ...(options.mode === undefined ? {} : { "datastar-mode": options.mode }),
    ...(options.namespace === undefined ? {} : { "datastar-namespace": options.namespace }),
    ...(options.useViewTransition === undefined ? {} : { "datastar-use-view-transition": String(options.useViewTransition) })
  })
  return platformHtmlResponse(renderPlatformHtml(html), { ...options, headers: datastarHeaders })
}

export interface PlatformJsonSignalsResponseOptions extends PlatformResponseOptions {
  readonly onlyIfMissing?: boolean
}

export const platformJsonSignalsResponse = (
  signals: JsonObject | string,
  options: PlatformJsonSignalsResponseOptions = {}
): HttpServerResponse.HttpServerResponse => {
  const headers = Headers.fromInput({
    ...Headers.fromInput(options.headers),
    ...(options.onlyIfMissing === undefined ? {} : { "datastar-only-if-missing": String(options.onlyIfMissing) })
  })
  return HttpServerResponse.text(typeof signals === "string" ? signals : JSON.stringify(signals), {
    ...options,
    contentType: options.contentType ?? "application/json; charset=utf-8",
    headers
  })
}

export interface PlatformScriptResponseOptions extends PlatformResponseOptions {
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
}

export const platformScriptResponse = (
  script: string,
  options: PlatformScriptResponseOptions = {}
): HttpServerResponse.HttpServerResponse => {
  const headers = Headers.fromInput({
    ...Headers.fromInput(options.headers),
    ...(options.attributes === undefined ? {} : { "datastar-script-attributes": JSON.stringify(options.attributes) })
  })
  return HttpServerResponse.text(script, {
    ...options,
    contentType: options.contentType ?? "text/javascript; charset=utf-8",
    headers
  })
}

export class DatastarResponseStatusError extends Error {
  readonly _tag = "DatastarResponseStatusError"

  constructor(
    readonly status: number,
    readonly expected: 200 | 204
  ) {
    super(`Datastar action responses with ${expected === 200 ? "bodies" : "no body"} must use HTTP ${expected}, received ${status}`)
  }
}

export type DatastarBodyResponseOptions = Omit<PlatformResponseOptions, "status"> & {
  readonly status?: 200
}

export type DatastarNoContentResponseOptions = Omit<PlatformResponseOptions, "contentType" | "status"> & {
  readonly status?: 204
}

export type DatastarHtmlPatchResponseOptions = Omit<PlatformHtmlPatchResponseOptions, "status"> & {
  readonly status?: 200
}

export type DatastarJsonSignalsResponseOptions = Omit<PlatformJsonSignalsResponseOptions, "status"> & {
  readonly status?: 200
}

export type DatastarScriptResponseOptions = Omit<PlatformScriptResponseOptions, "status"> & {
  readonly status?: 200
}

const assertDatastarStatus = (status: number | undefined, expected: 200 | 204): void => {
  if (status !== undefined && status !== expected) {
    throw new DatastarResponseStatusError(status, expected)
  }
}

const datastarBodyOptions = <Options extends { readonly status?: 200 }>(
  options: Options = {} as Options
): Omit<Options, "status"> & { readonly status: 200 } => {
  assertDatastarStatus(options.status, 200)
  const { status: _status, ...responseOptions } = options
  return { ...responseOptions, status: 200 } as Omit<Options, "status"> & { readonly status: 200 }
}

export const datastarNoContentResponse = (
  options: DatastarNoContentResponseOptions = {}
): HttpServerResponse.HttpServerResponse => {
  assertDatastarStatus(options.status, 204)
  const { status: _status, ...responseOptions } = options
  return HttpServerResponse.empty({ ...responseOptions, status: 204 })
}

export const datastarSseResponse = (
  events: ReadonlyArray<string>,
  options?: DatastarBodyResponseOptions
): HttpServerResponse.HttpServerResponse =>
  platformSseResponse(events, datastarBodyOptions(options))

export const datastarEventStreamResponse = (
  events: PlatformEventSource,
  options?: DatastarBodyResponseOptions
): HttpServerResponse.HttpServerResponse =>
  platformEventStreamResponse(events, datastarBodyOptions(options))

export const datastarPatchElementsResponse = (
  elements: string | Exclude<Child, string>,
  options?: PatchElementsOptions,
  responseOptions?: DatastarBodyResponseOptions
): HttpServerResponse.HttpServerResponse =>
  platformPatchElementsResponse(elements, options, datastarBodyOptions(responseOptions))

export const datastarPatchSignalsResponse = (
  signals: JsonObject | string,
  options?: PatchSignalsOptions,
  responseOptions?: DatastarBodyResponseOptions
): HttpServerResponse.HttpServerResponse =>
  platformPatchSignalsResponse(signals, options, datastarBodyOptions(responseOptions))

export const datastarHtmlPatchResponse = (
  html: string | Exclude<Child, string>,
  options?: DatastarHtmlPatchResponseOptions
): HttpServerResponse.HttpServerResponse =>
  platformHtmlPatchResponse(html, datastarBodyOptions(options))

export const datastarJsonSignalsResponse = (
  signals: JsonObject | string,
  options?: DatastarJsonSignalsResponseOptions
): HttpServerResponse.HttpServerResponse =>
  platformJsonSignalsResponse(signals, datastarBodyOptions(options))

export const datastarScriptResponse = (
  script: string,
  options?: DatastarScriptResponseOptions
): HttpServerResponse.HttpServerResponse =>
  platformScriptResponse(script, datastarBodyOptions(options))
