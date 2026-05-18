import type * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as Headers from "effect/unstable/http/Headers"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { page as htmlPage, render, type Child, type PageOptions as HtmlPageOptions } from "./html.js"
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

export type EventSource = AsyncIterable<string> | Stream.Stream<string, unknown>
export type StreamInput = ReadonlyArray<string> | EventSource

export interface HeartbeatOptions {
  readonly interval?: Duration.Input
  readonly initialDelay?: Duration.Input
  readonly comment?: string
}

export interface StreamOptions extends BodyOptions {
  readonly heartbeat?: HeartbeatOptions
}

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

export interface NavigateOptions extends BodyOptions {
  readonly baseUrl?: string | URL
  readonly allowedOrigins?: readonly (string | URL)[]
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
}

export class NavigationUrlError extends Error {
  readonly _tag = "NavigationUrlError"

  constructor(readonly url: string) {
    super(`Unsafe navigation URL: ${JSON.stringify(url)}`)
  }
}

const renderHtml = (content: Child): string => render(content)

const assertStatus = (status: number | undefined, expected: 200 | 204): void => {
  if (status !== undefined && status !== expected) {
    throw new ResponseStatusError(status, expected)
  }
}

const bodyOptions = (options: BodyOptions = {}): Omit<BodyOptions, "status"> & { readonly status: 200 } => {
  assertStatus(options.status, 200)
  const { status: _status, ...responseOptions } = options
  return { ...responseOptions, status: 200 }
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

const isEventArray = (events: StreamInput): events is ReadonlyArray<string> => Array.isArray(events)

const toEventStream = (source: StreamInput): Stream.Stream<string, unknown> => {
  if (isEventArray(source)) {
    return Stream.fromIterable(source)
  }

  return isEffectStream(source) ? source : Stream.fromAsyncIterable(source, (cause) => cause)
}

const sseComment = (comment = ""): string =>
  comment.length === 0 ? ":\n\n" : `: ${comment.replaceAll("\n", "\n: ")}\n\n`

const heartbeatStream = (options: HeartbeatOptions = {}): Stream.Stream<string> => {
  const ticks = Stream.tick(options.interval ?? "15 seconds").pipe(
    Stream.map(() => sseComment(options.comment ?? "heartbeat"))
  )

  if (options.initialDelay === undefined) {
    return ticks
  }

  return Stream.fromEffect(Effect.sleep(options.initialDelay)).pipe(
    Stream.flatMap(() => ticks)
  )
}

const withHeartbeat = <E = never, R = never>(
  events: Stream.Stream<string, E, R>,
  options?: HeartbeatOptions
): Stream.Stream<string, E, R> =>
  events.pipe(Stream.merge(heartbeatStream(options), { haltStrategy: "left" }))

const withoutHeartbeat = (options: StreamOptions): BodyOptions => {
  const { heartbeat: _heartbeat, ...responseOptions } = options
  return responseOptions
}

export const page = (
  options: HtmlPageOptions = {},
  responseOptions: ResponseOptions = {}
): HttpServerResponse.HttpServerResponse =>
  HttpServerResponse.text(htmlPage(options), {
    ...responseOptions,
    contentType: responseOptions.contentType ?? "text/html; charset=utf-8"
  })

export const patch = (
  elements: Child,
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
  options: StreamOptions = {}
): HttpServerResponse.HttpServerResponse => {
  const responseOptions = sseOptions(withoutHeartbeat(options))

  if (options.heartbeat === undefined && isEventArray(events)) {
    return HttpServerResponse.text(eventStream(...events), responseOptions)
  }

  const eventsWithHeartbeat = options.heartbeat === undefined
    ? toEventStream(events)
    : withHeartbeat(toEventStream(events), options.heartbeat)

  return HttpServerResponse.stream(eventsWithHeartbeat.pipe(Stream.encodeText), responseOptions)
}

export const done = (options: DoneOptions = {}): HttpServerResponse.HttpServerResponse => {
  assertStatus(options.status, 204)
  const { status: _status, ...responseOptions } = options
  return HttpServerResponse.empty({ ...responseOptions, status: 204 })
}

const directHtml = (
  html: Child,
  options: DirectHtmlOptions = {}
): HttpServerResponse.HttpServerResponse => {
  const { selector, mode, namespace, useViewTransition, ...body } = options
  const responseOptions = bodyOptions(body)
  const headers = Headers.fromInput({
    ...Headers.fromInput(body.headers),
    ...(selector === undefined ? {} : { "datastar-selector": selector }),
    ...(mode === undefined ? {} : { "datastar-mode": mode }),
    ...(namespace === undefined ? {} : { "datastar-namespace": namespace }),
    ...(useViewTransition === undefined ? {} : { "datastar-use-view-transition": String(useViewTransition) })
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
  const { onlyIfMissing, ...body } = options
  const responseOptions = bodyOptions(body)
  const headers = Headers.fromInput({
    ...Headers.fromInput(body.headers),
    ...(onlyIfMissing === undefined ? {} : { "datastar-only-if-missing": String(onlyIfMissing) })
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
  const { attributes, ...body } = options
  const responseOptions = bodyOptions(body)
  const headers = Headers.fromInput({
    ...Headers.fromInput(body.headers),
    ...(attributes === undefined ? {} : { "datastar-script-attributes": JSON.stringify(attributes) })
  })

  return HttpServerResponse.text(script, {
    ...responseOptions,
    contentType: options.contentType ?? "text/javascript; charset=utf-8",
    headers
  })
}

const hasControlCharacters = (value: string): boolean => /[\u0000-\u001F\u007F]/u.test(value)

const originOf = (value: string | URL): string => {
  const raw = value.toString()
  try {
    const url = new URL(raw)
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new NavigationUrlError(raw)
    }
    return url.origin
  } catch (error) {
    if (error instanceof NavigationUrlError) {
      throw error
    }
    throw new NavigationUrlError(raw)
  }
}

const safeNavigationUrl = (
  input: string | URL,
  options: {
    readonly baseUrl?: string | URL | undefined
    readonly allowedOrigins?: readonly (string | URL)[] | undefined
  } = {}
): string => {
  const raw = input.toString()
  if (hasControlCharacters(raw)) {
    throw new NavigationUrlError(raw)
  }

  let base: URL
  let url: URL
  try {
    base = new URL(options.baseUrl?.toString() ?? "http://localhost")
    url = new URL(raw, base)
  } catch {
    throw new NavigationUrlError(raw)
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new NavigationUrlError(raw)
  }

  if (url.origin === base.origin) {
    return `${url.pathname}${url.search}${url.hash}`
  }

  const allowedOrigins = options.allowedOrigins ?? []
  if (allowedOrigins.some((origin) => originOf(origin) === url.origin)) {
    return url.toString()
  }

  throw new NavigationUrlError(raw)
}

export const navigate = (
  url: string | URL,
  options: NavigateOptions = {}
): HttpServerResponse.HttpServerResponse => {
  const { baseUrl, allowedOrigins, ...responseOptions } = options
  const safeUrl = safeNavigationUrl(url, { baseUrl, allowedOrigins })
  return directScript(`window.location.href = ${JSON.stringify(safeUrl)}`, responseOptions)
}

export const direct = {
  html: directHtml,
  signals: directSignals,
  script: directScript
} as const
