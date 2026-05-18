import { page as htmlPage, render, type Child, type PageOptions as HtmlPageOptions } from "./html.js"
import {
  patchElements,
  patchSignals,
  type ElementNamespace,
  type ElementPatchMode,
  type JsonObject,
  type PatchElementsOptions,
  type PatchSignalsOptions
} from "./sse.js"

export type DatastarResponseInit = Omit<ResponseInit, "status" | "statusText">
export type PageResponseInit = ResponseInit

export interface HeartbeatOptions {
  readonly intervalMs?: number
  readonly initialDelayMs?: number
  readonly comment?: string
}

export interface StreamOptions extends DatastarResponseInit {
  readonly heartbeat?: HeartbeatOptions
}

export interface DirectHtmlOptions extends DatastarResponseInit {
  readonly selector?: string
  readonly mode?: ElementPatchMode
  readonly namespace?: ElementNamespace
  readonly useViewTransition?: boolean
}

export interface DirectSignalsOptions extends DatastarResponseInit {
  readonly onlyIfMissing?: boolean
}

export interface DirectScriptOptions extends DatastarResponseInit {
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
}

export interface NavigateOptions extends DirectScriptOptions {
  readonly baseUrl?: string | URL
  readonly allowedOrigins?: readonly (string | URL)[]
}

export type EventChunk = string | Uint8Array
export type StreamInput = string | Iterable<string> | AsyncIterable<EventChunk> | ReadableStream<EventChunk>

export class NavigationUrlError extends Error {
  readonly _tag = "NavigationUrlError"

  constructor(readonly url: string) {
    super(`Unsafe navigation URL: ${JSON.stringify(url)}`)
  }
}

const textEncoder = new TextEncoder()

const mergeHeaders = (defaults: HeadersInit, headers: HeadersInit | undefined): Headers => {
  const merged = new Headers(defaults)
  if (headers !== undefined) {
    new Headers(headers).forEach((value, key) => {
      merged.set(key, value)
    })
  }
  return merged
}

const response = (
  body: BodyInit | null,
  init: DatastarResponseInit | undefined,
  status: 200 | 204,
  defaultHeaders: HeadersInit = {}
): Response =>
  new Response(body, {
    ...init,
    status,
    headers: mergeHeaders(defaultHeaders, init?.headers)
  })

const htmlHeader = { "content-type": "text/html; charset=utf-8" } as const
const sseHeader = {
  "cache-control": "no-cache",
  "content-type": "text/event-stream"
} as const

const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

const isReadableStream = (source: unknown): source is ReadableStream<EventChunk> =>
  typeof source === "object" && source !== null && "getReader" in source

const isAsyncIterable = (source: unknown): source is AsyncIterable<EventChunk> =>
  typeof source === "object" && source !== null && Symbol.asyncIterator in source

async function* readableStreamToAsyncIterable(source: ReadableStream<EventChunk>): AsyncIterable<EventChunk> {
  const reader = source.getReader()
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) {
        return
      }
      yield result.value
    }
  } finally {
    reader.releaseLock()
  }
}

async function* toAsyncIterable(source: StreamInput): AsyncIterable<EventChunk> {
  if (typeof source === "string") {
    yield source
    return
  }

  if (isReadableStream(source)) {
    yield* readableStreamToAsyncIterable(source)
    return
  }

  if (isAsyncIterable(source)) {
    yield* source
    return
  }

  yield* source
}

const sseComment = (comment = ""): string =>
  comment.length === 0 ? ":\n\n" : `: ${comment.replaceAll("\n", "\n: ")}\n\n`

async function* withHeartbeat(
  events: AsyncIterable<EventChunk>,
  options: HeartbeatOptions = {}
): AsyncIterable<EventChunk> {
  const iterator = events[Symbol.asyncIterator]()
  let next = iterator.next()
  let heartbeatDelay = options.initialDelayMs ?? options.intervalMs ?? 15_000

  try {
    while (true) {
      const result = await Promise.race([
        next.then((event) => ({ _tag: "event" as const, event })),
        delay(heartbeatDelay).then(() => ({ _tag: "heartbeat" as const }))
      ])

      if (result._tag === "heartbeat") {
        yield sseComment(options.comment ?? "heartbeat")
        heartbeatDelay = options.intervalMs ?? 15_000
        continue
      }

      if (result.event.done === true) {
        return
      }

      yield result.event.value
      next = iterator.next()
      heartbeatDelay = options.intervalMs ?? 15_000
    }
  } finally {
    void iterator.return?.()
  }
}

const encodeChunk = (chunk: EventChunk): Uint8Array =>
  typeof chunk === "string" ? textEncoder.encode(chunk) : chunk

const readableStreamFrom = (source: AsyncIterable<EventChunk>): ReadableStream<Uint8Array> => {
  const iterator = source[Symbol.asyncIterator]()

  return new ReadableStream({
    async pull(controller) {
      const result = await iterator.next()
      if (result.done === true) {
        controller.close()
        return
      }
      controller.enqueue(encodeChunk(result.value))
    },
    cancel() {
      void iterator.return?.()
    }
  })
}

const withoutHeartbeat = (options: StreamOptions): DatastarResponseInit => {
  const { heartbeat: _heartbeat, ...init } = options
  return init
}

export const page = (
  options: HtmlPageOptions = {},
  init: PageResponseInit = {}
): Response =>
  new Response(htmlPage(options), {
    ...init,
    headers: mergeHeaders(htmlHeader, init.headers)
  })

export const patch = (
  elements: Child,
  options?: PatchElementsOptions,
  init?: DatastarResponseInit
): Response =>
  response(patchElements(render(elements), options), init, 200, sseHeader)

export const signals = (
  value: JsonObject | string,
  options?: PatchSignalsOptions,
  init?: DatastarResponseInit
): Response =>
  response(patchSignals(value, options), init, 200, sseHeader)

export const stream = (
  events: StreamInput,
  options: StreamOptions = {}
): Response => {
  const init = withoutHeartbeat(options)
  const eventSource = options.heartbeat === undefined
    ? toAsyncIterable(events)
    : withHeartbeat(toAsyncIterable(events), options.heartbeat)

  return response(readableStreamFrom(eventSource), init, 200, sseHeader)
}

export const done = (init: DatastarResponseInit = {}): Response =>
  response(null, init, 204)

export const directHtml = (
  html: Child,
  options: DirectHtmlOptions = {}
): Response => {
  const { selector, mode, namespace, useViewTransition, ...init } = options
  const headers = mergeHeaders({
    "content-type": "text/html; charset=utf-8",
    ...(selector === undefined ? {} : { "datastar-selector": selector }),
    ...(mode === undefined ? {} : { "datastar-mode": mode }),
    ...(namespace === undefined ? {} : { "datastar-namespace": namespace }),
    ...(useViewTransition === undefined ? {} : { "datastar-use-view-transition": String(useViewTransition) })
  }, init.headers)

  return response(render(html), { ...init, headers }, 200)
}

export const directSignals = (
  value: JsonObject | string,
  options: DirectSignalsOptions = {}
): Response => {
  const { onlyIfMissing, ...init } = options
  const headers = mergeHeaders({
    "content-type": "application/json; charset=utf-8",
    ...(onlyIfMissing === undefined ? {} : { "datastar-only-if-missing": String(onlyIfMissing) })
  }, init.headers)

  return response(typeof value === "string" ? value : JSON.stringify(value), { ...init, headers }, 200)
}

export const directScript = (
  script: string,
  options: DirectScriptOptions = {}
): Response => {
  const { attributes, ...init } = options
  const headers = mergeHeaders({
    "content-type": "text/javascript; charset=utf-8",
    ...(attributes === undefined ? {} : { "datastar-script-attributes": JSON.stringify(attributes) })
  }, init.headers)

  return response(script, { ...init, headers }, 200)
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
): Response => {
  const { baseUrl, allowedOrigins, ...init } = options
  const safeUrl = safeNavigationUrl(url, { baseUrl, allowedOrigins })
  return directScript(`window.location.href = ${JSON.stringify(safeUrl)}`, init)
}
