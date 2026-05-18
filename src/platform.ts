import * as Headers from "@effect/platform/Headers"
import type * as HttpApp from "@effect/platform/HttpApp"
import * as HttpRouter from "@effect/platform/HttpRouter"
import * as HttpServerError from "@effect/platform/HttpServerError"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import type { Handler, Route } from "./handler.js"
import { render, type Child } from "./html.js"
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
