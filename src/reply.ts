import * as Stream from "effect/Stream"
import * as Headers from "effect/unstable/http/Headers"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { datastarDocument, type DatastarDocumentOptions } from "./client.js"
import { render, type Child } from "./html.js"
import {
  eventStream,
  patchElements,
  patchSignals,
  type ElementNamespace,
  type ElementPatchMode,
  type JsonObject,
  type PatchElementsOptions,
  type PatchSignalsOptions
} from "./sse.js"

export type ResponseOptions = HttpServerResponse.Options

export class ResponseStatusError extends Error {
  readonly _tag = "ResponseStatusError"

  constructor(
    readonly status: number,
    readonly expected: 200 | 204
  ) {
    super(`Datastar action responses with ${expected === 200 ? "bodies" : "no body"} must use HTTP ${expected}, received ${status}`)
  }
}

export type BodyOptions = Omit<ResponseOptions, "status"> & {
  readonly status?: 200
}

export type DoneOptions = Omit<ResponseOptions, "contentType" | "status"> & {
  readonly status?: 204
}

export interface PageOptions extends DatastarDocumentOptions, ResponseOptions {}

export type EventSource = AsyncIterable<string> | Stream.Stream<string, unknown>
export type StreamInput = ReadonlyArray<string> | EventSource

export interface DirectHtmlOptions extends BodyOptions {
  readonly selector?: string
  readonly mode?: ElementPatchMode
  readonly namespace?: ElementNamespace
  readonly useViewTransition?: boolean
}

export interface DirectSignalsOptions extends BodyOptions {
  readonly onlyIfMissing?: boolean
}

export interface DirectScriptOptions extends BodyOptions {
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
}

const renderHtml = (content: string | Exclude<Child, string>): string =>
  typeof content === "string" ? content : render(content)

const assertStatus = (status: number | undefined, expected: 200 | 204): void => {
  if (status !== undefined && status !== expected) {
    throw new ResponseStatusError(status, expected)
  }
}

const bodyOptions = <Options extends { readonly status?: 200 }>(
  options: Options = {} as Options
): Omit<Options, "status"> & { readonly status: 200 } => {
  assertStatus(options.status, 200)
  const { status: _status, ...responseOptions } = options
  return { ...responseOptions, status: 200 } as Omit<Options, "status"> & { readonly status: 200 }
}

const sseHeaders = (headers: Headers.Input | undefined): Headers.Headers => {
  const existing = Headers.fromInput(headers)
  return Headers.fromInput({
    ...existing,
    "cache-control": existing["cache-control"] ?? "no-cache",
    connection: existing.connection ?? "keep-alive"
  })
}

const sseOptions = (options: BodyOptions = {}): ResponseOptions => ({
  ...bodyOptions(options),
  contentType: options.contentType ?? "text/event-stream",
  headers: sseHeaders(options.headers)
})

const isEffectStream = (source: EventSource): source is Stream.Stream<string, unknown> =>
  typeof source === "object" && source !== null && "channel" in source

const eventSourceStream = (source: EventSource): Stream.Stream<Uint8Array, unknown> =>
  (isEffectStream(source) ? source : Stream.fromAsyncIterable(source, (cause) => cause)).pipe(Stream.encodeText)

const isEventArray = (events: StreamInput): events is ReadonlyArray<string> => Array.isArray(events)

export const page = (body: Child, options: PageOptions = {}): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.text(datastarDocument(body, options), {
    ...options,
    contentType: options.contentType ?? "text/html; charset=utf-8"
  })

export const patch = (
  elements: string | Exclude<Child, string>,
  options?: PatchElementsOptions,
  responseOptions?: BodyOptions
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.text(eventStream(patchElements(renderHtml(elements), options)), sseOptions(responseOptions))

export const signals = (
  value: JsonObject | string,
  options?: PatchSignalsOptions,
  responseOptions?: BodyOptions
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.text(eventStream(patchSignals(value, options)), sseOptions(responseOptions))

export const stream = (
  events: StreamInput,
  options?: BodyOptions
): HttpServerResponse.HttpServerResponse => {
  const responseOptions = sseOptions(options)
  return isEventArray(events)
    ? HttpServerResponse.text(eventStream(...events), responseOptions)
    : HttpServerResponse.stream(eventSourceStream(events), responseOptions)
}

export const done = (options: DoneOptions = {}): HttpServerResponse.HttpServerResponse => {
  assertStatus(options.status, 204)
  const { status: _status, ...responseOptions } = options
  return HttpServerResponse.empty({ ...responseOptions, status: 204 })
}

const directHtml = (
  html: string | Exclude<Child, string>,
  options: DirectHtmlOptions = {}
): HttpServerResponse.HttpServerResponse => {
  const responseOptions = bodyOptions(options)
  const headers = Headers.fromInput({
    ...Headers.fromInput(options.headers),
    ...(options.selector === undefined ? {} : { "datastar-selector": options.selector }),
    ...(options.mode === undefined ? {} : { "datastar-mode": options.mode }),
    ...(options.namespace === undefined ? {} : { "datastar-namespace": options.namespace }),
    ...(options.useViewTransition === undefined ? {} : { "datastar-use-view-transition": String(options.useViewTransition) })
  })

  return HttpServerResponse.text(renderHtml(html), {
    ...responseOptions,
    contentType: options.contentType ?? "text/html; charset=utf-8",
    headers
  })
}

const directSignals = (
  value: JsonObject | string,
  options: DirectSignalsOptions = {}
): HttpServerResponse.HttpServerResponse => {
  const responseOptions = bodyOptions(options)
  const headers = Headers.fromInput({
    ...Headers.fromInput(options.headers),
    ...(options.onlyIfMissing === undefined ? {} : { "datastar-only-if-missing": String(options.onlyIfMissing) })
  })

  return HttpServerResponse.text(typeof value === "string" ? value : JSON.stringify(value), {
    ...responseOptions,
    contentType: options.contentType ?? "application/json; charset=utf-8",
    headers
  })
}

const directScript = (
  script: string,
  options: DirectScriptOptions = {}
): HttpServerResponse.HttpServerResponse => {
  const responseOptions = bodyOptions(options)
  const headers = Headers.fromInput({
    ...Headers.fromInput(options.headers),
    ...(options.attributes === undefined ? {} : { "datastar-script-attributes": JSON.stringify(options.attributes) })
  })

  return HttpServerResponse.text(script, {
    ...responseOptions,
    contentType: options.contentType ?? "text/javascript; charset=utf-8",
    headers
  })
}

export const direct = {
  html: directHtml,
  signals: directSignals,
  script: directScript
} as const
