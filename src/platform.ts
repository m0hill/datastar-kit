import * as Headers from "@effect/platform/Headers"
import type * as HttpApp from "@effect/platform/HttpApp"
import * as HttpRouter from "@effect/platform/HttpRouter"
import * as HttpServerError from "@effect/platform/HttpServerError"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Effect from "effect/Effect"
import type * as ParseResult from "effect/ParseResult"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import type { Handler, Route } from "./handler.js"
import { render, type Child } from "./html.js"
import type { ElementPatchMode } from "./sse.js"
import { parseSignalsJson, type SignalJsonError } from "./request.js"
import { eventStream, patchElements, patchSignals, type JsonObject, type PatchElementsOptions, type PatchSignalsOptions } from "./sse.js"

export const toPlatformApp = <E, R>(
  app: Handler<E, R>
): HttpApp.Default<E | HttpServerError.RequestError, R> =>
  Effect.gen(function* () {
    const request = yield* HttpServerRequest.HttpServerRequest
    const webRequest = yield* HttpServerRequest.toWeb(request)
    const webResponse = yield* app(webRequest)
    return HttpServerResponse.fromWeb(webResponse)
  })

export class PlatformPathError extends Error {
  readonly _tag = "PlatformPathError"

  constructor(readonly path: string) {
    super(`Effect Platform routes must start with '/': ${JSON.stringify(path)}`)
  }
}

type RouteError<RouteLike> = RouteLike extends Route<infer E, infer _> ? E : never
type RouteContext<RouteLike> = RouteLike extends Route<infer _, infer R> ? R : never

const toPlatformPath = (path: string): HttpRouter.PathInput => {
  if (path === "*" || path.startsWith("/")) {
    return path as HttpRouter.PathInput
  }
  throw new PlatformPathError(path)
}

export const toPlatformRoute = <E, R>(
  route: Route<E, R>
): HttpRouter.Route<E | HttpServerError.RequestError, R> =>
  HttpRouter.makeRoute(route.method, toPlatformPath(route.path), toPlatformApp(route.handler))

export const toPlatformRouter = <Routes extends ReadonlyArray<Route<unknown, unknown>>>(
  ...routes: Routes
): HttpRouter.HttpRouter<HttpServerError.RequestError | RouteError<Routes[number]>, RouteContext<Routes[number]>> =>
  HttpRouter.fromIterable(routes.map(toPlatformRoute)) as HttpRouter.HttpRouter<
    HttpServerError.RequestError | RouteError<Routes[number]>,
    RouteContext<Routes[number]>
  >

const platformMethodsWithQuerySignals = new Set(["GET", "DELETE"])

export const platformRawSignalsFromRequest = (
  request: HttpServerRequest.HttpServerRequest
): Effect.Effect<string, HttpServerError.RequestError> => {
  if (platformMethodsWithQuerySignals.has(request.method)) {
    return Effect.succeed(new URL(request.url, "http://localhost").searchParams.get("datastar") ?? "{}")
  }

  return request.text.pipe(Effect.map((body) => body.length === 0 ? "{}" : body))
}

export const platformReadSignalsFromRequest = <A, I, R>(
  request: HttpServerRequest.HttpServerRequest,
  schema: Schema.Schema<A, I, R>
): Effect.Effect<A, HttpServerError.RequestError | SignalJsonError | ParseResult.ParseError, R> =>
  platformRawSignalsFromRequest(request).pipe(
    Effect.flatMap(parseSignalsJson),
    Effect.flatMap(Schema.decodeUnknown(schema))
  )

export const platformReadSignals = <A, I, R>(
  schema: Schema.Schema<A, I, R>
): Effect.Effect<A, HttpServerError.RequestError | SignalJsonError | ParseResult.ParseError, R | HttpServerRequest.HttpServerRequest> =>
  HttpServerRequest.HttpServerRequest.pipe(
    Effect.flatMap((request) => platformReadSignalsFromRequest(request, schema))
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

export const platformEventStreamResponse = (
  events: AsyncIterable<string>,
  options?: PlatformResponseOptions
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.stream(
    Stream.fromAsyncIterable(events, (cause) => cause).pipe(Stream.encodeText),
    platformSseOptions(options)
  )

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
  HttpServerResponse.html(renderPlatformHtml(html)).pipe(
    HttpServerResponse.setStatus(options.status ?? 200, options.statusText),
    HttpServerResponse.setHeaders(Headers.fromInput(options.headers))
  )

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
