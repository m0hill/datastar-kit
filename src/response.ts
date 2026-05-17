import { eventStream, patchElements, patchSignals, type JsonObject, type PatchElementsOptions, type PatchSignalsOptions } from "./sse.js"

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

export const htmlResponse = (html: string): Response =>
  new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8"
    }
  })

export const patchElementsResponse = (elements: string, options?: PatchElementsOptions): Response =>
  sseResponse(patchElements(elements, options))

export const patchSignalsResponse = (signals: JsonObject | string, options?: PatchSignalsOptions): Response =>
  sseResponse(patchSignals(signals, options))
