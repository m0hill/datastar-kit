import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { readSignals } from "./request.js"

export type Handler<E = never, R = never> = (request: Request) => Effect.Effect<Response, E, R>
export type RouteMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export interface Route<E = never, R = never> {
  readonly method: RouteMethod
  readonly path: string
  readonly handler: Handler<E, R>
}

export const handler = <E, R>(run: Handler<E, R>): Handler<E, R> => run

export const withSignals = <A, I, R, E2, R2>(
  schema: Schema.Schema<A, I, R>,
  f: (signals: A, request: Request) => Effect.Effect<Response, E2, R2>
) =>
(request: Request) =>
  readSignals(request, schema).pipe(Effect.flatMap((signals) => f(signals, request)))

export const route = <E, R>(method: RouteMethod, path: string, routeHandler: Handler<E, R>): Route<E, R> => ({
  method,
  path,
  handler: routeHandler
})

const joinPaths = (prefix: string, path: string): string => {
  const normalizedPrefix = prefix === "/" ? "" : prefix.replace(/\/+$/, "")
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${normalizedPrefix}${normalizedPath}` || "/"
}

export const prefixRoutes = <Routes extends ReadonlyArray<Route<any, any>>>(
  prefix: string,
  ...routes: Routes
): Routes =>
  routes.map((candidate) => ({
    ...candidate,
    path: joinPaths(prefix, candidate.path)
  })) as unknown as Routes

export const textResponse = (body: string, init?: ResponseInit): Response => {
  const headers = new Headers(init?.headers)

  if (!headers.has("content-type")) {
    headers.set("content-type", "text/plain; charset=utf-8")
  }

  const responseInit: ResponseInit = {
    headers,
    status: init?.status ?? 200
  }

  if (init?.statusText !== undefined) {
    responseInit.statusText = init.statusText
  }

  return new Response(body, responseInit)
}

export const notFound = (): Response => textResponse("Not Found", { status: 404 })
export const methodNotAllowed = (allowed: ReadonlySet<RouteMethod>): Response =>
  textResponse("Method Not Allowed", {
    status: 405,
    headers: {
      allow: [...allowed].join(", ")
    }
  })

export const router = <Routes extends ReadonlyArray<Route<any, any>>>(...routes: Routes): Handler<
  Routes[number] extends Route<infer E, any> ? E : never,
  Routes[number] extends Route<any, infer R> ? R : never
> =>
(request) => {
  const url = new URL(request.url)
  const method = request.method.toUpperCase() as RouteMethod
  const pathMatches = routes.filter((candidate) => candidate.path === url.pathname)

  if (pathMatches.length === 0) {
    return Effect.succeed(notFound())
  }

  const match = pathMatches.find((candidate) => candidate.method === method)

  if (match === undefined) {
    return Effect.succeed(methodNotAllowed(new Set(pathMatches.map((candidate) => candidate.method))))
  }

  return match.handler(request)
}
