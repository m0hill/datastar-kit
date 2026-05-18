import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { readFile } from "node:fs/promises"
import { h, htmlDocument, type Child, type HtmlDocumentOptions, type HtmlNode } from "./html.js"
import { platformHtmlResponse } from "./platform.js"

export const datastarScript = (src = "/datastar.js"): HtmlNode =>
  h("script", {
    type: "module",
    src
  })

export interface DatastarDocumentOptions {
  readonly lang?: string
  readonly scriptSrc?: string
  readonly head?: Child
}

const childArray = (child: Child | undefined): readonly Child[] => {
  if (child === undefined) {
    return []
  }
  return Array.isArray(child) ? child : [child]
}

export const datastarDocument = (body: Child, options: DatastarDocumentOptions = {}): string => {
  const documentOptions: HtmlDocumentOptions = {
    head: [...childArray(options.head), datastarScript(options.scriptSrc)],
    body
  }

  if (options.lang !== undefined) {
    return htmlDocument({ ...documentOptions, lang: options.lang })
  }

  return htmlDocument(documentOptions)
}

export const datastarPageResponse = (
  body: Child,
  options: DatastarDocumentOptions = {}
): HttpServerResponse.HttpServerResponse => platformHtmlResponse(datastarDocument(body, options))

export interface DatastarClientResponseOptions {
  readonly cacheControl?: string
  readonly headers?: Readonly<Record<string, string>>
}

const datastarClientHeaders = (options: DatastarClientResponseOptions = {}) => ({
  "cache-control": options.cacheControl ?? "no-cache",
  ...options.headers
})

export const datastarClientResponse = (
  script: string | Uint8Array,
  options: DatastarClientResponseOptions = {}
): HttpServerResponse.HttpServerResponse => {
  const responseOptions = {
    contentType: "text/javascript; charset=utf-8",
    headers: datastarClientHeaders(options)
  }

  return typeof script === "string"
    ? HttpServerResponse.text(script, responseOptions)
    : HttpServerResponse.uint8Array(script, responseOptions)
}

export const datastarClientRoute = (
  script: string | Uint8Array,
  path: HttpRouter.PathInput = "/datastar.js",
  options?: DatastarClientResponseOptions
): HttpRouter.Route<never, never> =>
  HttpRouter.route("GET", path, datastarClientResponse(script, options))

export const datastarClientRoutes = <Routes extends ReadonlyArray<HttpRouter.Route<unknown, unknown>>>(
  script: string | Uint8Array,
  ...routes: Routes
): readonly [HttpRouter.Route<never, never>, ...Routes] =>
  [datastarClientRoute(script), ...routes] as readonly [HttpRouter.Route<never, never>, ...Routes]

export const datastarClientFileRoute = (
  filePath: string,
  path: HttpRouter.PathInput = "/datastar.js",
  options?: DatastarClientResponseOptions
): HttpRouter.Route<unknown, never> =>
  HttpRouter.route(
    "GET",
    path,
    Effect.tryPromise(() => readFile(filePath)).pipe(
      Effect.map((script) => datastarClientResponse(script, options))
    )
  )

export const datastarClientFileRoutes = <Routes extends ReadonlyArray<HttpRouter.Route<unknown, unknown>>>(
  filePath: string,
  ...routes: Routes
): readonly [HttpRouter.Route<unknown, never>, ...Routes] =>
  [datastarClientFileRoute(filePath), ...routes] as readonly [HttpRouter.Route<unknown, never>, ...Routes]
