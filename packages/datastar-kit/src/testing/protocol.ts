import * as read from "../read.js"
import type { SseEventOptions } from "../sse.js"
import type {
  DatastarDirectHtmlEvent,
  DatastarDirectScriptEvent,
  DatastarDirectSignalsEvent,
  DatastarFlightEvent,
  DatastarPatchElementsEvent,
  DatastarPatchSignalsEvent,
  DatastarRequestEvent,
  DatastarResponseBodyTruncatedEvent,
  DatastarResponseEvent,
  DatastarResponseInspectionOptions,
  DatastarSseEvent,
  RawSseEvent
} from "./types.js"
import {
  appendDataLine,
  parseScriptAttributes,
  parseSignalsSource,
  recordedError
} from "./utils.js"

const rawSseEvents = (input: string): readonly RawSseEvent[] => {
  const events: RawSseEvent[] = []
  let event: string | undefined
  let id: string | undefined
  let retry: number | undefined
  let dataLines: string[] = []

  const commit = () => {
    if (event !== undefined || id !== undefined || retry !== undefined || dataLines.length > 0) {
      events.push({
        ...(event === undefined ? {} : { event }),
        ...(id === undefined ? {} : { id }),
        ...(retry === undefined ? {} : { retry }),
        dataLines
      })
    }

    event = undefined
    id = undefined
    retry = undefined
    dataLines = []
  }

  for (const rawLine of input.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n")) {
    if (rawLine === "") {
      commit()
      continue
    }

    if (rawLine.startsWith(":")) continue

    const separator = rawLine.indexOf(":")
    const field = separator === -1 ? rawLine : rawLine.slice(0, separator)
    const rawValue = separator === -1 ? "" : rawLine.slice(separator + 1)
    const value = rawValue.startsWith(" ") ? rawValue.slice(1) : rawValue

    switch (field) {
      case "event":
        event = value
        break
      case "id":
        id = value
        break
      case "retry": {
        const parsed = Number(value)
        if (!Number.isNaN(parsed)) retry = parsed
        break
      }
      case "data":
        dataLines.push(value)
        break
    }
  }

  commit()
  return events
}

const sseMeta = (event: DatastarSseEvent): SseEventOptions => ({
  ...(event.id === undefined ? {} : { id: event.id }),
  ...(event.retry === undefined ? {} : { retry: event.retry })
})

const directHtmlEvent = (body: string, headers: Headers): DatastarDirectHtmlEvent => {
  const selector = headers.get("datastar-selector") ?? undefined
  const mode = headers.get("datastar-mode") ?? undefined
  const namespace = headers.get("datastar-namespace") ?? undefined
  const useViewTransition = headers.get("datastar-use-view-transition")

  return {
    type: "direct.html",
    html: body,
    ...(selector === undefined ? {} : { selector }),
    ...(mode === undefined ? {} : { mode }),
    ...(namespace === undefined ? {} : { namespace }),
    ...(useViewTransition === null ? {} : { useViewTransition: useViewTransition === "true" })
  }
}

const directSignalsEvent = (body: string, headers: Headers): DatastarDirectSignalsEvent => {
  const signals = parseSignalsSource(body, { strictJson: true })
  const onlyIfMissing = headers.get("datastar-only-if-missing")

  return {
    type: "direct.signals",
    signalsSource: body,
    ...signals,
    ...(onlyIfMissing === null ? {} : { onlyIfMissing: onlyIfMissing === "true" })
  }
}

const directScriptEvent = (body: string, headers: Headers): DatastarDirectScriptEvent => {
  const attributes = parseScriptAttributes(headers.get("datastar-script-attributes"))

  return {
    type: "direct.script",
    script: body,
    ...(attributes === undefined ? {} : { attributes })
  }
}

const patchElementsEvent = (event: DatastarSseEvent): DatastarPatchElementsEvent => ({
  type: "patch.elements",
  ...sseMeta(event),
  elements: event.data.elements ?? "",
  ...(event.data.selector === undefined ? {} : { selector: event.data.selector }),
  mode: event.data.mode ?? "outer",
  namespace: event.data.namespace ?? "html",
  useViewTransition: event.data.useViewTransition === "true",
  ...(event.data.viewTransitionSelector === undefined
    ? {}
    : { viewTransitionSelector: event.data.viewTransitionSelector })
})

const patchSignalsEvent = (event: DatastarSseEvent): DatastarPatchSignalsEvent => {
  const source = event.data.signals ?? "{}"
  const signals = parseSignalsSource(source)

  return {
    type: "patch.signals",
    ...sseMeta(event),
    signalsSource: source,
    ...signals,
    onlyIfMissing: event.data.onlyIfMissing === "true"
  }
}

const contentTypeIncludes = (contentType: string | null, expected: string): boolean =>
  contentType?.toLowerCase().includes(expected) ?? false

const responseTruncationEvent = (
  reason: DatastarResponseBodyTruncatedEvent["reason"],
  bytesRead: number,
  options: DatastarResponseInspectionOptions
): DatastarResponseBodyTruncatedEvent => ({
  type: "response.body.truncated",
  reason,
  bytesRead,
  ...(options.maxBytes === undefined ? {} : { maxBytes: options.maxBytes }),
  ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs })
})

interface ResponseTextInspection {
  readonly text: string
  readonly truncated?: DatastarResponseBodyTruncatedEvent
}

const timeout = Symbol("Datastar response inspection timeout")

const readWithOptionalTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number | undefined
): Promise<T | typeof timeout> => {
  if (timeoutMs === undefined) return promise

  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race<T | typeof timeout>([
      promise,
      new Promise<typeof timeout>((resolve) => {
        timer = setTimeout(() => resolve(timeout), timeoutMs)
      })
    ])
  } finally {
    clearTimeout(timer)
  }
}

const inspectResponseText = async (
  response: Response,
  options: DatastarResponseInspectionOptions = {}
): Promise<ResponseTextInspection> => {
  const maxBytes = options.maxBytes
  const body = response.clone().body

  if (body === null) {
    return { text: "" }
  }

  const reader = body.getReader()
  const decoder = new TextDecoder()
  let text = ""
  let bytesRead = 0
  let releaseLock = true

  try {
    while (true) {
      const result = await readWithOptionalTimeout(reader.read(), options.timeoutMs)

      if (result === timeout) {
        releaseLock = false
        void reader.cancel().catch(() => undefined)
        return { text, truncated: responseTruncationEvent("timeout", bytesRead, options) }
      }

      if (result.done) {
        return { text: text + decoder.decode() }
      }

      const chunk = result.value
      if (maxBytes !== undefined && bytesRead + chunk.byteLength > maxBytes) {
        const remaining = Math.max(0, maxBytes - bytesRead)
        if (remaining > 0) {
          text += decoder.decode(chunk.slice(0, remaining), { stream: true })
          bytesRead += remaining
        }
        void reader.cancel().catch(() => undefined)
        return { text, truncated: responseTruncationEvent("maxBytes", bytesRead, options) }
      }

      bytesRead += chunk.byteLength
      text += decoder.decode(chunk, { stream: true })
    }
  } finally {
    if (releaseLock) reader.releaseLock()
  }
}

const withOptionalTruncation = (
  events: readonly DatastarFlightEvent[],
  inspection: ResponseTextInspection
): readonly DatastarFlightEvent[] =>
  inspection.truncated === undefined ? events : [...events, inspection.truncated]

/**
 * Parses a Datastar SSE stream into semantic Datastar event records.
 */
export const parseDatastarSse = (input: string): readonly DatastarSseEvent[] => {
  const events: DatastarSseEvent[] = []

  for (const raw of rawSseEvents(input)) {
    const data: Record<string, string> = {}
    for (const line of raw.dataLines) {
      appendDataLine(data, line)
    }

    events.push({
      event: raw.event ?? "message",
      ...(raw.id === undefined ? {} : { id: raw.id }),
      ...(raw.retry === undefined ? {} : { retry: raw.retry }),
      data
    })
  }

  return events
}

/**
 * Converts parsed Datastar SSE events into Flight Recorder timeline events.
 */
export const datastarSseToFlightEvents = (
  events: readonly DatastarSseEvent[]
): readonly DatastarFlightEvent[] =>
  events.map((event): DatastarFlightEvent => {
    switch (event.event) {
      case "datastar-patch-elements":
        return patchElementsEvent(event)
      case "datastar-patch-signals":
        return patchSignalsEvent(event)
      default:
        return {
          type: "sse.event",
          ...sseMeta(event),
          event: event.event,
          data: event.data
        }
    }
  })

/**
 * Records the Datastar signal payload a handler received without consuming the original request.
 */
export const inspectDatastarRequest = async (request: Request): Promise<DatastarRequestEvent> => {
  try {
    const signals = await read.signals(request.clone())
    return {
      type: "request",
      method: request.method.toUpperCase(),
      url: request.url,
      signals
    }
  } catch (error) {
    return {
      type: "request",
      method: request.method.toUpperCase(),
      url: request.url,
      signalError: recordedError(error)
    }
  }
}

/**
 * Parses a native `Response` into semantic Datastar response events.
 */
export const inspectDatastarResponse = async (
  response: Response,
  options: DatastarResponseInspectionOptions = {}
): Promise<readonly DatastarFlightEvent[]> => {
  const contentType = response.headers.get("content-type")
  const responseEvent: DatastarResponseEvent = {
    type: "response",
    status: response.status,
    contentType
  }

  if (response.status === 204) {
    return [responseEvent, { type: "response.done" }]
  }

  if (response.status !== 200) {
    return [responseEvent]
  }

  const readBody = () => inspectResponseText(response, options)

  if (contentTypeIncludes(contentType, "text/event-stream")) {
    const body = await readBody()
    return withOptionalTruncation(
      [responseEvent, ...datastarSseToFlightEvents(parseDatastarSse(body.text))],
      body
    )
  }

  if (contentTypeIncludes(contentType, "text/html")) {
    const body = await readBody()
    return withOptionalTruncation(
      [responseEvent, directHtmlEvent(body.text, response.headers)],
      body
    )
  }

  if (contentTypeIncludes(contentType, "application/json")) {
    const body = await readBody()
    return withOptionalTruncation(
      [responseEvent, directSignalsEvent(body.text, response.headers)],
      body
    )
  }

  if (contentTypeIncludes(contentType, "text/javascript")) {
    const body = await readBody()
    return withOptionalTruncation(
      [responseEvent, directScriptEvent(body.text, response.headers)],
      body
    )
  }

  return [responseEvent]
}
