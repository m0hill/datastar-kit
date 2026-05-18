import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import type * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Headers from "effect/unstable/http/Headers"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerError from "effect/unstable/http/HttpServerError"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { render, type Child } from "./html.js"
import type { ElementPatchMode } from "./sse.js"
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
