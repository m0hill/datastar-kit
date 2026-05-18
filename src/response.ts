import { render, type Child } from "./html.js"
import { eventStream, patchElements, patchSignals, type ElementPatchMode, type JsonObject, type PatchElementsOptions, type PatchSignalsOptions } from "./sse.js"

export const sseHeaders = (): Headers =>
  new Headers({
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive"
  })

export const sseResponse = (...events: ReadonlyArray<string>): Response =>
  new Response(eventStream(...events), {
    headers: sseHeaders()
  })

export const emptyResponse = (status = 204, init?: Omit<ResponseInit, "status">): Response =>
  new Response(null, {
    ...init,
    status
  })

export type HtmlContent = string | Exclude<Child, string>

const renderHtmlContent = (content: HtmlContent): string => typeof content === "string" ? content : render(content)

const headersWithDefault = (headersInit: HeadersInit | undefined, name: string, value: string): Headers => {
  const headers = new Headers(headersInit)
  if (!headers.has(name)) {
    headers.set(name, value)
  }
  return headers
}

export const htmlResponse = (html: HtmlContent, init?: ResponseInit): Response =>
  new Response(renderHtmlContent(html), {
    ...init,
    headers: headersWithDefault(init?.headers, "content-type", "text/html; charset=utf-8")
  })

export interface HtmlPatchResponseOptions {
  readonly selector?: string
  readonly mode?: ElementPatchMode
  readonly useViewTransition?: boolean
  readonly init?: ResponseInit
}

export const htmlPatchResponse = (html: HtmlContent, options: HtmlPatchResponseOptions = {}): Response => {
  const headers = headersWithDefault(options.init?.headers, "content-type", "text/html; charset=utf-8")

  if (options.selector !== undefined) headers.set("datastar-selector", options.selector)
  if (options.mode !== undefined) headers.set("datastar-mode", options.mode)
  if (options.useViewTransition !== undefined) {
    headers.set("datastar-use-view-transition", String(options.useViewTransition))
  }

  return new Response(renderHtmlContent(html), { ...options.init, headers })
}

export interface JsonSignalsResponseOptions {
  readonly onlyIfMissing?: boolean
  readonly init?: ResponseInit
}

export const jsonSignalsResponse = (
  signals: JsonObject | string,
  options: JsonSignalsResponseOptions = {}
): Response => {
  const headers = headersWithDefault(options.init?.headers, "content-type", "application/json; charset=utf-8")

  if (options.onlyIfMissing !== undefined) {
    headers.set("datastar-only-if-missing", String(options.onlyIfMissing))
  }

  return new Response(typeof signals === "string" ? signals : JSON.stringify(signals), { ...options.init, headers })
}

export interface ScriptResponseOptions {
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
  readonly init?: ResponseInit
}

export const scriptResponse = (script: string, options: ScriptResponseOptions = {}): Response => {
  const headers = headersWithDefault(options.init?.headers, "content-type", "text/javascript; charset=utf-8")

  if (options.attributes !== undefined) {
    headers.set("datastar-script-attributes", JSON.stringify(options.attributes))
  }

  return new Response(script, { ...options.init, headers })
}

export const patchElementsResponse = (elements: HtmlContent, options?: PatchElementsOptions): Response =>
  sseResponse(patchElements(renderHtmlContent(elements), options))

export const patchSignalsResponse = (signals: JsonObject | string, options?: PatchSignalsOptions): Response =>
  sseResponse(patchSignals(signals, options))
