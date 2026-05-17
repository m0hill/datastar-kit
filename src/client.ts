import * as Effect from "effect/Effect"
import { readFile } from "node:fs/promises"
import { route, type Route } from "./handler.js"
import { h, htmlDocument, type Child, type HtmlDocumentOptions, type HtmlNode } from "./html.js"
import { htmlResponse } from "./response.js"

export const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

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

export const datastarPageResponse = (body: Child, options: DatastarDocumentOptions = {}): Response =>
  htmlResponse(datastarDocument(body, options))

export interface DatastarClientResponseOptions {
  readonly cacheControl?: string
}

const scriptBody = (script: string | Uint8Array): BodyInit => {
  if (typeof script === "string") {
    return script
  }

  return script.buffer.slice(script.byteOffset, script.byteOffset + script.byteLength) as ArrayBuffer
}

export const datastarClientResponse = (
  script: string | Uint8Array,
  options: DatastarClientResponseOptions = {}
): Response =>
  new Response(scriptBody(script), {
    headers: {
      "content-type": "text/javascript; charset=utf-8",
      "cache-control": options.cacheControl ?? "no-cache"
    }
  })

export const datastarClientRoute = (
  script: string | Uint8Array,
  path = "/datastar.js",
  options?: DatastarClientResponseOptions
): Route<never, never> =>
  route("GET", path, () => Effect.succeed(datastarClientResponse(script, options)))

export const datastarClientRoutes = <Routes extends ReadonlyArray<Route<any, any>>>(
  script: string | Uint8Array,
  ...routes: Routes
): readonly [Route<never, never>, ...Routes] =>
  [datastarClientRoute(script), ...routes] as readonly [Route<never, never>, ...Routes]

export const datastarClientFileRoute = (
  filePath: string,
  path = "/datastar.js",
  options?: DatastarClientResponseOptions
): Route<unknown, never> =>
  route("GET", path, () =>
    Effect.promise(() => readFile(filePath)).pipe(
      Effect.map((script) => datastarClientResponse(script, options))
    )
  )
