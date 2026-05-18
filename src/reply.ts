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
  constructor(readonly url: string) {
    super(`Unsafe navigation URL: ${JSON.stringify(url)}`)
  }
}

const textEncoder = new TextEncoder()

const mergeHeaders = (defaults: HeadersInit, headers: HeadersInit | undefined): Headers => {
  const merged = new Headers(defaults)
  new Headers(headers).forEach((value, key) => {
    merged.set(key, value)
  })
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
const heartbeat = { done: "heartbeat" } as const

async function* toAsyncIterable(source: StreamInput): AsyncIterable<EventChunk> {
  if (typeof source === "string") {
    yield source
    return
  }

  if (typeof source === "object" && source !== null && "getReader" in source) {
    const reader = source.getReader()
    try {
      while (true) {
        const result = await reader.read()
        if (result.done) return
        yield result.value
      }
    } finally {
      reader.releaseLock()
    }
    return
  }

  if (typeof source === "object" && source !== null && Symbol.asyncIterator in source) {
    yield* (source as AsyncIterable<EventChunk>)
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
        next,
        delay(heartbeatDelay).then(() => heartbeat)
      ])

      if (result.done === "heartbeat") {
        yield sseComment(options.comment ?? "heartbeat")
        heartbeatDelay = options.intervalMs ?? 15_000
        continue
      }

      if (result.done === true) {
        return
      }

      yield result.value
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

export const page = (
  options: HtmlPageOptions = {},
  init: ResponseInit = {}
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
  const { heartbeat, ...init } = options
  const eventSource = heartbeat === undefined
    ? toAsyncIterable(events)
    : withHeartbeat(toAsyncIterable(events), heartbeat)

  return response(readableStreamFrom(eventSource), init, 200, sseHeader)
}

export const done = (init: DatastarResponseInit = {}): Response =>
  response(null, init, 204)

export const directHtml = (
  html: Child,
  options: DirectHtmlOptions = {}
): Response => {
  const { selector, mode, namespace, useViewTransition, ...init } = options
  return response(render(html), init, 200, {
    "content-type": "text/html; charset=utf-8",
    ...(selector === undefined ? {} : { "datastar-selector": selector }),
    ...(mode === undefined ? {} : { "datastar-mode": mode }),
    ...(namespace === undefined ? {} : { "datastar-namespace": namespace }),
    ...(useViewTransition === undefined ? {} : { "datastar-use-view-transition": String(useViewTransition) })
  })
}

export const directSignals = (
  value: JsonObject | string,
  options: DirectSignalsOptions = {}
): Response => {
  const { onlyIfMissing, ...init } = options
  return response(typeof value === "string" ? value : JSON.stringify(value), init, 200, {
    "content-type": "application/json; charset=utf-8",
    ...(onlyIfMissing === undefined ? {} : { "datastar-only-if-missing": String(onlyIfMissing) })
  })
}

export const directScript = (
  script: string,
  options: DirectScriptOptions = {}
): Response => {
  const { attributes, ...init } = options
  return response(script, init, 200, {
    "content-type": "text/javascript; charset=utf-8",
    ...(attributes === undefined ? {} : { "datastar-script-attributes": JSON.stringify(attributes) })
  })
}

const safeNavigationUrl = (
  input: string | URL,
  options: {
    readonly baseUrl?: string | URL | undefined
    readonly allowedOrigins?: readonly (string | URL)[] | undefined
  } = {}
): string => {
  const raw = input.toString()
  if (/[\u0000-\u001F\u007F]/u.test(raw)) {
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

  for (const origin of options.allowedOrigins ?? []) {
    try {
      const allowed = new URL(origin.toString())
      if ((allowed.protocol === "http:" || allowed.protocol === "https:") && allowed.origin === url.origin) {
        return url.toString()
      }
    } catch {
      // Treat malformed allowlist entries as non-matches.
    }
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
