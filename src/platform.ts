import type * as HttpApp from "@effect/platform/HttpApp"
import * as HttpRouter from "@effect/platform/HttpRouter"
import * as HttpServerError from "@effect/platform/HttpServerError"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import * as Effect from "effect/Effect"
import type { Handler, Route } from "./handler.js"

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
