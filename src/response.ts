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

export const htmlResponse = (html: string): Response =>
  new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8"
    }
  })

export interface HtmlPatchResponseOptions {
  readonly selector?: string
  readonly mode?: ElementPatchMode
  readonly useViewTransition?: boolean
}

export const htmlPatchResponse = (html: string, options: HtmlPatchResponseOptions = {}): Response => {
  const headers = new Headers({
    "content-type": "text/html; charset=utf-8"
  })

  if (options.selector !== undefined) headers.set("datastar-selector", options.selector)
  if (options.mode !== undefined) headers.set("datastar-mode", options.mode)
  if (options.useViewTransition !== undefined) {
    headers.set("datastar-use-view-transition", String(options.useViewTransition))
  }

  return new Response(html, { headers })
}

export interface JsonSignalsResponseOptions {
  readonly onlyIfMissing?: boolean
}

export const jsonSignalsResponse = (
  signals: JsonObject | string,
  options: JsonSignalsResponseOptions = {}
): Response => {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8"
  })

  if (options.onlyIfMissing !== undefined) {
    headers.set("datastar-only-if-missing", String(options.onlyIfMissing))
  }

  return new Response(typeof signals === "string" ? signals : JSON.stringify(signals), { headers })
}

export interface ScriptResponseOptions {
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
}

export const scriptResponse = (script: string, options: ScriptResponseOptions = {}): Response => {
  const headers = new Headers({
    "content-type": "text/javascript; charset=utf-8"
  })

  if (options.attributes !== undefined) {
    headers.set("datastar-script-attributes", JSON.stringify(options.attributes))
  }

  return new Response(script, { headers })
}

export const patchElementsResponse = (elements: string, options?: PatchElementsOptions): Response =>
  sseResponse(patchElements(elements, options))

export const patchSignalsResponse = (signals: JsonObject | string, options?: PatchSignalsOptions): Response =>
  sseResponse(patchSignals(signals, options))
