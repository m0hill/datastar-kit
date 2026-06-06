import * as read from "./read.js"
import type { SseEventOptions } from "./sse.js"
import type { SignalState } from "./types.js"

export type DatastarFlightEvent =
  | DatastarRequestEvent
  | DatastarResponseEvent
  | DatastarResponseDoneEvent
  | DatastarDirectHtmlEvent
  | DatastarDirectSignalsEvent
  | DatastarDirectScriptEvent
  | DatastarPatchElementsEvent
  | DatastarPatchSignalsEvent
  | DatastarFetchErrorEvent
  | DatastarBrowserUserEvent
  | DatastarBrowserSignalPatchEvent
  | DatastarDomMutationEvent
  | DatastarUnknownSseEvent

export interface DatastarFlight {
  readonly events: readonly DatastarFlightEvent[]
}

interface DatastarRequestBaseEvent {
  readonly type: "request"
  readonly method: string
  readonly url: string
}

type DatastarRecordedSignals =
  | { readonly signals: SignalState; readonly signalError?: never }
  | { readonly signals?: never; readonly signalError: DatastarRecordedError }

type DatastarOptionalRecordedSignals =
  | DatastarRecordedSignals
  | { readonly signals?: never; readonly signalError?: never }

export type DatastarRequestEvent = DatastarRequestBaseEvent & DatastarRecordedSignals

export interface DatastarResponseEvent {
  readonly type: "response"
  readonly status: number
  readonly contentType: string | null
}

export interface DatastarResponseDoneEvent {
  readonly type: "response.done"
}

export interface DatastarDirectHtmlEvent {
  readonly type: "direct.html"
  readonly html: string
  readonly selector?: string
  readonly mode?: string
  readonly namespace?: string
  readonly useViewTransition?: boolean
}

export type DatastarDirectSignalsEvent = {
  readonly type: "direct.signals"
  readonly signalsSource: string
  readonly onlyIfMissing?: boolean
} & DatastarOptionalRecordedSignals

export interface DatastarDirectScriptEvent {
  readonly type: "direct.script"
  readonly script: string
  readonly attributes?: Readonly<Record<string, string>>
}

export interface DatastarPatchElementsEvent extends SseEventOptions {
  readonly type: "patch.elements"
  readonly elements: string
  readonly selector?: string
  readonly mode: string
  readonly namespace: string
  readonly useViewTransition: boolean
  readonly viewTransitionSelector?: string
}

export type DatastarPatchSignalsEvent = SseEventOptions & {
  readonly type: "patch.signals"
  readonly signalsSource: string
  readonly onlyIfMissing: boolean
} & DatastarOptionalRecordedSignals

export type DatastarFetchErrorEvent = Partial<Pick<DatastarRequestEvent, "method" | "url">> & {
  readonly type: "fetch.error"
  readonly error: DatastarRecordedError
}

export interface DatastarBrowserUserEvent {
  readonly type: "browser.user"
  readonly event: string
  readonly target: string
  readonly datastarAttribute?: string
  readonly expression?: string
}

export type DatastarBrowserSignalPatchEvent = {
  readonly type: "browser.signal.patch"
} & DatastarRecordedSignals

export interface DatastarDomMutation {
  readonly type: MutationRecord["type"]
  readonly target: string
  readonly attributeName?: Exclude<MutationRecord["attributeName"], null>
  readonly oldValue?: Exclude<MutationRecord["oldValue"], null>
  readonly addedNodes?: readonly string[]
  readonly removedNodes?: readonly string[]
  readonly text?: string
}

export interface DatastarDomMutationEvent {
  readonly type: "browser.dom.mutation"
  readonly mutations: readonly DatastarDomMutation[]
}

export interface DatastarUnknownSseEvent extends SseEventOptions {
  readonly type: "sse.event"
  readonly event: string
  readonly data: Readonly<Record<string, string>>
}

export interface DatastarSseEvent extends SseEventOptions {
  readonly event: string
  readonly data: Readonly<Record<string, string>>
}

export interface DatastarRecordedError {
  readonly name: string
  readonly message: string
  readonly input?: unknown
}

type TextExpectation<T extends string | undefined> = Exclude<T, undefined> | RegExp
type TextExpectations<Source, Keys extends keyof Source> = Partial<{
  readonly [Key in Keys]: TextExpectation<Extract<Source[Key], string | undefined>>
}>
type SignalExpectation = Readonly<Record<string, unknown>>

export type DatastarRequestExpectation = Partial<{
  readonly method: DatastarRequestEvent["method"]
  readonly url: TextExpectation<DatastarRequestEvent["url"]>
  readonly signals: SignalExpectation
}>

export type DatastarPatchElementsExpectation = Partial<{
  readonly elements: TextExpectation<DatastarPatchElementsEvent["elements"]>
  readonly selector: TextExpectation<DatastarPatchElementsEvent["selector"]>
  readonly mode: DatastarPatchElementsEvent["mode"]
  readonly namespace: DatastarPatchElementsEvent["namespace"]
  readonly useViewTransition: DatastarPatchElementsEvent["useViewTransition"]
  readonly viewTransitionSelector: TextExpectation<
    DatastarPatchElementsEvent["viewTransitionSelector"]
  >
}>

export type DatastarPatchSignalsExpectation = Partial<
  Pick<DatastarPatchSignalsEvent, "onlyIfMissing">
>

export type DatastarBrowserUserExpectation = Partial<Pick<DatastarBrowserUserEvent, "event">> &
  TextExpectations<DatastarBrowserUserEvent, "target" | "datastarAttribute" | "expression">

export type DatastarDomMutationExpectation = Partial<Pick<DatastarDomMutation, "type">> &
  TextExpectations<DatastarDomMutation, "target" | "attributeName" | "text">

export interface DatastarFlightAssertions {
  toHaveRequested(expectation: DatastarRequestExpectation): DatastarRequestEvent
  toHavePatchedElements(expectation: DatastarPatchElementsExpectation): DatastarPatchElementsEvent
  toHavePatchedSignals(
    signals: SignalExpectation,
    expectation?: DatastarPatchSignalsExpectation
  ): DatastarPatchSignalsEvent
  toHavePatchedSignalSource(
    source: TextExpectation<DatastarPatchSignalsEvent["signalsSource"]>,
    expectation?: DatastarPatchSignalsExpectation
  ): DatastarPatchSignalsEvent
  toHaveBrowserUserEvent(expectation: DatastarBrowserUserExpectation): DatastarBrowserUserEvent
  toHaveBrowserSignalPatch(signals: SignalExpectation): DatastarBrowserSignalPatchEvent
  toHaveDomMutation(expectation?: DatastarDomMutationExpectation): DatastarDomMutationEvent
  toHaveNoSignalErrors(): void
}

type AsyncFlightAssertions<Keys extends keyof DatastarFlightAssertions> = {
  [Key in Keys]: DatastarFlightAssertions[Key] extends (...args: infer Args) => infer Result
    ? (...args: Args) => Promise<Result>
    : never
}

type DatastarResponseAssertionName =
  | "toHavePatchedElements"
  | "toHavePatchedSignals"
  | "toHavePatchedSignalSource"
  | "toHaveNoSignalErrors"

export type DatastarResponseAssertions = AsyncFlightAssertions<DatastarResponseAssertionName> & {
  flight(): Promise<DatastarFlight>
  format(): Promise<string>
}

export interface DatastarFlightRecorder {
  assert(): DatastarFlightAssertions
  clear(): void
  flight(): DatastarFlight
  format(): string
  recordEvent(event: DatastarFlightEvent): void
  recordRequest(request: Request): Promise<DatastarRequestEvent>
  recordResponse(response: Response): Promise<Response>
  handle(
    request: Request,
    handler: (request: Request) => Response | Promise<Response>
  ): Promise<Response>
}

export type DatastarFetchTarget = Pick<typeof globalThis, "fetch">

export type DatastarFetchRecorderInclude = (request: Request) => boolean

export interface DatastarFetchRecorderOptions {
  /** Predicate deciding which fetch requests are recorded. Defaults to Datastar action requests. */
  readonly include?: DatastarFetchRecorderInclude
  /** Existing recorder to write fetch events into. A new recorder is created when omitted. */
  readonly recorder?: DatastarFlightRecorder
  /** Object whose `fetch` method should be wrapped. Defaults to `globalThis`. */
  readonly target?: DatastarFetchTarget
}

export interface DatastarFetchRecorderInstallation {
  readonly recorder: DatastarFlightRecorder
  flush(): Promise<void>
  uninstall(): void
}

export interface DatastarBrowserRecorderOptions extends DatastarFetchRecorderOptions {
  /** Document whose Datastar custom events and user events should be recorded. */
  readonly document?: Document
  /** User event names to record from elements with `data-on:*` attributes. Defaults to common UI events. */
  readonly userEvents?: readonly string[] | false
  /** Whether to record Datastar's `datastar-signal-patch` browser event. @defaultValue `true` */
  readonly signalPatches?: boolean
  /** Whether to record DOM mutation summaries. @defaultValue `true` */
  readonly domMutations?: boolean
  /** DOM node observed for mutations. Defaults to the document element, then body. */
  readonly mutationTarget?: Node
  /** MutationObserver constructor override for tests and non-standard browser environments. */
  readonly mutationObserver?: typeof MutationObserver
}

export type DatastarBrowserRecorderInstallation = DatastarFetchRecorderInstallation

interface RawSseEvent {
  readonly event?: string
  readonly id?: string
  readonly retry?: number
  readonly dataLines: readonly string[]
}

const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isSignalState = (value: unknown): value is SignalState => isRecord(value)

const recordedError = (error: unknown): DatastarRecordedError => {
  if (error instanceof read.SignalParseError || error instanceof read.SignalShapeError) {
    return {
      name: error.constructor.name,
      message: error.message,
      input: error.input
    }
  }

  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    }
  }

  return {
    name: "Error",
    message: String(error)
  }
}

const fetchErrorEvent = (error: unknown, request?: Request): DatastarFetchErrorEvent => ({
  type: "fetch.error",
  ...(request === undefined
    ? {}
    : {
        method: request.method.toUpperCase(),
        url: request.url
      }),
  error: recordedError(error)
})

const requestFromFetchArgs = (...[input, init]: Parameters<typeof fetch>): Request =>
  input instanceof Request && init === undefined ? input.clone() : new Request(input, init)

/**
 * Returns true when a request looks like it was initiated by Datastar's action runtime.
 */
export const isDatastarFetchRequest: DatastarFetchRecorderInclude = (request) =>
  request.headers.has("datastar-request")

const parseSignalsSource = (
  source: string,
  options: { readonly strictJson?: boolean } = {}
): DatastarOptionalRecordedSignals => {
  try {
    const value: unknown = JSON.parse(source)
    if (!isSignalState(value)) {
      return { signalError: recordedError(new read.SignalShapeError(value)) }
    }

    return { signals: value }
  } catch (cause) {
    return options.strictJson
      ? { signalError: recordedError(new read.SignalParseError(source, { cause })) }
      : {}
  }
}

const parseScriptAttributes = (
  value: string | null
): Readonly<Record<string, string>> | undefined => {
  if (value === null) return undefined

  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined

    const attributes: Record<string, string> = {}
    for (const [key, item] of Object.entries(parsed)) {
      attributes[key] = String(item)
    }
    return attributes
  } catch {
    return undefined
  }
}

const appendDataLine = (data: Record<string, string>, line: string): void => {
  const separator = line.indexOf(" ")
  const key = separator === -1 ? line : line.slice(0, separator)
  const value = separator === -1 ? "" : line.slice(separator + 1)

  data[key] = data[key] === undefined ? value : `${data[key]}\n${value}`
}

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

const describeObject = (value: unknown): string =>
  JSON.stringify(
    value,
    (_key, item: unknown) => (item instanceof RegExp ? item.toString() : item),
    2
  )

const describeExpectation = (value: unknown): string =>
  value instanceof RegExp ? value.toString() : describeObject(value)

const matchesText = (
  actual: string | undefined,
  expected: TextExpectation<string | undefined> | undefined
): boolean => {
  if (expected === undefined) return true
  if (actual === undefined) return false
  return expected instanceof RegExp ? new RegExp(expected).test(actual) : actual === expected
}

const matchesValue = (actual: unknown, expected: unknown): boolean => {
  if (expected instanceof RegExp) {
    return typeof actual === "string" && matchesText(actual, expected)
  }

  if (Array.isArray(expected)) {
    return (
      Array.isArray(actual) &&
      actual.length === expected.length &&
      expected.every((item, index) => matchesValue(actual[index], item))
    )
  }

  if (isRecord(expected)) {
    if (!isRecord(actual)) return false

    return Object.entries(expected).every(([key, value]) => matchesValue(actual[key], value))
  }

  return Object.is(actual, expected)
}

type BrowserElementLike = Pick<Element, "getAttribute" | "getAttributeNames"> &
  Partial<Pick<Element, "tagName" | "id">> & {
    readonly parentElement?: unknown
  }

const isBrowserElementLike = (value: unknown): value is BrowserElementLike =>
  typeof value === "object" &&
  value !== null &&
  "getAttribute" in value &&
  typeof value.getAttribute === "function" &&
  "getAttributeNames" in value &&
  typeof value.getAttributeNames === "function"

const browserParentElement = (node: unknown): unknown =>
  isRecord(node) && "parentElement" in node ? node.parentElement : undefined

const describeBrowserNode = (node: unknown): string => {
  if (isBrowserElementLike(node)) {
    const tag = node.tagName?.toLowerCase() ?? "element"
    const id = node.id === undefined || node.id.length === 0 ? "" : `#${node.id}`
    return `${tag}${id}`
  }

  if (typeof Node !== "undefined" && node instanceof Node) {
    if (node.nodeType === Node.TEXT_NODE) return `text ${JSON.stringify(node.textContent ?? "")}`
    if (node.nodeType === Node.DOCUMENT_NODE) return "#document"
  }

  return "node"
}

const describeBrowserNodeSnapshot = (node: unknown): string => {
  if (isRecord(node) && typeof node.outerHTML === "string") return node.outerHTML
  if (isRecord(node) && typeof node.textContent === "string") return node.textContent
  return describeBrowserNode(node)
}

const datastarEventAttribute = (
  element: BrowserElementLike
): Pick<DatastarBrowserUserEvent, "datastarAttribute" | "expression"> | undefined => {
  const datastarAttribute = element.getAttributeNames().find((name) => name.startsWith("data-on:"))
  if (datastarAttribute === undefined) return undefined

  const expression = element.getAttribute(datastarAttribute) ?? undefined
  return {
    datastarAttribute,
    ...(expression === undefined ? {} : { expression })
  }
}

const browserUserEvent = (event: Event): DatastarBrowserUserEvent | undefined => {
  let node: unknown = event.target

  while (node !== undefined && node !== null) {
    if (isBrowserElementLike(node)) {
      const datastar = datastarEventAttribute(node)
      if (datastar !== undefined) {
        return {
          type: "browser.user",
          event: event.type,
          target: describeBrowserNode(node),
          ...datastar
        }
      }
    }

    node = browserParentElement(node)
  }

  return undefined
}

const browserSignalPatchEvent = (event: Event): DatastarBrowserSignalPatchEvent => {
  const detail: unknown = "detail" in event ? event.detail : undefined

  if (isSignalState(detail)) {
    return {
      type: "browser.signal.patch",
      signals: detail
    }
  }

  return {
    type: "browser.signal.patch",
    signalError: recordedError(new read.SignalShapeError(detail))
  }
}

const domMutationEvent = (
  records: readonly MutationRecord[]
): DatastarDomMutationEvent | undefined => {
  const mutations: DatastarDomMutation[] = records.map((record) => ({
    type: record.type,
    target: describeBrowserNode(record.target),
    ...(record.attributeName == null ? {} : { attributeName: record.attributeName }),
    ...(record.oldValue == null ? {} : { oldValue: record.oldValue }),
    ...(record.type === "childList"
      ? {
          addedNodes: Array.from(record.addedNodes, describeBrowserNodeSnapshot),
          removedNodes: Array.from(record.removedNodes, describeBrowserNodeSnapshot)
        }
      : {}),
    ...(record.type === "characterData" ? { text: record.target.textContent ?? "" } : {})
  }))

  return mutations.length === 0 ? undefined : { type: "browser.dom.mutation", mutations }
}

const formatEvent = (event: DatastarFlightEvent): readonly string[] => {
  switch (event.type) {
    case "request":
      return [
        `${event.method} ${event.url}`,
        event.signalError === undefined
          ? `signals: ${describeObject(event.signals)}`
          : `signals error: ${event.signalError.message}`
      ]
    case "response":
      return [`response ${event.status}`, `content-type: ${event.contentType ?? "<none>"}`]
    case "response.done":
      return ["response completed with no Datastar body"]
    case "direct.html":
      return [
        `direct HTML${event.selector === undefined ? "" : ` -> ${event.selector}`}`,
        event.html
      ]
    case "direct.signals":
      return [
        `direct signals${event.onlyIfMissing === true ? " (if missing)" : ""}`,
        event.signalError === undefined
          ? event.signals === undefined
            ? event.signalsSource
            : describeObject(event.signals)
          : `signals error: ${event.signalError.message}\n${event.signalsSource}`
      ]
    case "direct.script":
      return ["direct script", event.script]
    case "patch.elements":
      return [
        `patch elements (${event.mode}/${event.namespace})${event.selector === undefined ? "" : ` -> ${event.selector}`}`,
        event.elements
      ]
    case "patch.signals":
      return [
        `patch signals${event.onlyIfMissing ? " (if missing)" : ""}`,
        event.signalError === undefined
          ? event.signals === undefined
            ? event.signalsSource
            : describeObject(event.signals)
          : `signals error: ${event.signalError.message}\n${event.signalsSource}`
      ]
    case "fetch.error": {
      const target = [event.method, event.url].filter((item) => item !== undefined).join(" ")
      return [
        `fetch error${target.length === 0 ? "" : ` ${target}`}`,
        `${event.error.name}: ${event.error.message}`
      ]
    }
    case "browser.user":
      return [
        `${event.event} ${event.target}`,
        [event.datastarAttribute, event.expression].filter((item) => item !== undefined).join(" = ")
      ].filter((line) => line.length > 0)
    case "browser.signal.patch":
      return [
        "browser signal patch",
        event.signalError === undefined
          ? describeObject(event.signals)
          : `signals error: ${event.signalError.message}`
      ]
    case "browser.dom.mutation":
      return [
        "DOM mutation",
        ...event.mutations.map((mutation) => {
          const suffix = mutation.attributeName === undefined ? "" : ` ${mutation.attributeName}`
          return `${mutation.type}${suffix} -> ${mutation.target}`
        })
      ]
    case "sse.event":
      return [`SSE ${event.event}`, describeObject(event.data)]
    default:
      throw new TypeError(`Unhandled Datastar flight event: ${JSON.stringify(event)}`)
  }
}

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
  response: Response
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

  const readBody = () => response.clone().text()

  if (contentTypeIncludes(contentType, "text/event-stream")) {
    const body = await readBody()
    return [responseEvent, ...datastarSseToFlightEvents(parseDatastarSse(body))]
  }

  if (contentTypeIncludes(contentType, "text/html")) {
    return [responseEvent, directHtmlEvent(await readBody(), response.headers)]
  }

  if (contentTypeIncludes(contentType, "application/json")) {
    return [responseEvent, directSignalsEvent(await readBody(), response.headers)]
  }

  if (contentTypeIncludes(contentType, "text/javascript")) {
    return [responseEvent, directScriptEvent(await readBody(), response.headers)]
  }

  return [responseEvent]
}

/**
 * Formats a recorded Flight timeline for assertion failures and debugging output.
 */
export const formatDatastarFlight = (flight: DatastarFlight): string => {
  const lines = ["Datastar Flight Recorder", ""]

  for (const [index, event] of flight.events.entries()) {
    const [title, ...details] = formatEvent(event)
    lines.push(`${index + 1}. ${title}`)
    for (const detail of details) {
      lines.push(...detail.split("\n").map((line) => (line.length === 0 ? "   " : `   ${line}`)))
    }
    lines.push("")
  }

  return lines.join("\n").trimEnd()
}

/**
 * Error thrown by framework-agnostic Flight Recorder assertion helpers.
 */
export class DatastarFlightAssertionError extends Error {
  constructor(
    message: string,
    readonly flight: DatastarFlight
  ) {
    super(`${message}\n\n${formatDatastarFlight(flight)}`)
    this.name = "DatastarFlightAssertionError"
  }
}

const hasSignalError: (event: DatastarFlightEvent) => boolean = (event) => {
  switch (event.type) {
    case "request":
    case "direct.signals":
    case "patch.signals":
    case "browser.signal.patch":
      return event.signalError !== undefined
    default:
      return false
  }
}

const expectFlightEvent = <Event extends DatastarFlightEvent>(
  flight: DatastarFlight,
  description: string,
  matches: (event: DatastarFlightEvent) => event is Event
): Event => {
  const event = flight.events.find(matches)
  if (event === undefined) {
    throw new DatastarFlightAssertionError(
      `Expected Datastar flight to include ${description}`,
      flight
    )
  }
  return event
}

const requestMatches = (
  event: DatastarFlightEvent,
  expectation: DatastarRequestExpectation
): event is DatastarRequestEvent => {
  if (event.type !== "request") return false
  if (expectation.method !== undefined && event.method !== expectation.method.toUpperCase()) {
    return false
  }
  if (!matchesText(event.url, expectation.url)) return false
  if (expectation.signals !== undefined && !matchesValue(event.signals, expectation.signals)) {
    return false
  }

  return true
}

const patchElementsMatches = (
  event: DatastarFlightEvent,
  expectation: DatastarPatchElementsExpectation
): event is DatastarPatchElementsEvent =>
  event.type === "patch.elements" &&
  matchesText(event.elements, expectation.elements) &&
  matchesText(event.selector, expectation.selector) &&
  (expectation.mode === undefined || event.mode === expectation.mode) &&
  (expectation.namespace === undefined || event.namespace === expectation.namespace) &&
  (expectation.useViewTransition === undefined ||
    event.useViewTransition === expectation.useViewTransition) &&
  matchesText(event.viewTransitionSelector, expectation.viewTransitionSelector)

const patchSignalsMatches = (
  event: DatastarFlightEvent,
  signals: SignalExpectation,
  expectation: DatastarPatchSignalsExpectation
): event is DatastarPatchSignalsEvent =>
  event.type === "patch.signals" &&
  matchesValue(event.signals, signals) &&
  (expectation.onlyIfMissing === undefined || event.onlyIfMissing === expectation.onlyIfMissing)

const patchSignalSourceMatches = (
  event: DatastarFlightEvent,
  source: TextExpectation<DatastarPatchSignalsEvent["signalsSource"]>,
  expectation: DatastarPatchSignalsExpectation
): event is DatastarPatchSignalsEvent =>
  event.type === "patch.signals" &&
  matchesText(event.signalsSource, source) &&
  (expectation.onlyIfMissing === undefined || event.onlyIfMissing === expectation.onlyIfMissing)

const browserUserEventMatches = (
  event: DatastarFlightEvent,
  expectation: DatastarBrowserUserExpectation
): event is DatastarBrowserUserEvent =>
  event.type === "browser.user" &&
  (expectation.event === undefined || event.event === expectation.event) &&
  matchesText(event.target, expectation.target) &&
  matchesText(event.datastarAttribute, expectation.datastarAttribute) &&
  matchesText(event.expression, expectation.expression)

const browserSignalPatchMatches = (
  event: DatastarFlightEvent,
  signals: SignalExpectation
): event is DatastarBrowserSignalPatchEvent =>
  event.type === "browser.signal.patch" && matchesValue(event.signals, signals)

const domMutationMatches = (
  mutation: DatastarDomMutation,
  expectation: DatastarDomMutationExpectation
): boolean =>
  (expectation.type === undefined || mutation.type === expectation.type) &&
  matchesText(mutation.target, expectation.target) &&
  matchesText(mutation.attributeName, expectation.attributeName) &&
  matchesText(mutation.text, expectation.text)

const domMutationEventMatches = (
  event: DatastarFlightEvent,
  expectation: DatastarDomMutationExpectation = {}
): event is DatastarDomMutationEvent =>
  event.type === "browser.dom.mutation" &&
  event.mutations.some((mutation) => domMutationMatches(mutation, expectation))

/**
 * Creates framework-agnostic semantic assertions for a recorded Datastar Flight.
 */
export const assertDatastarFlight = (flight: DatastarFlight): DatastarFlightAssertions => ({
  toHaveRequested(expectation) {
    return expectFlightEvent(flight, `request ${describeExpectation(expectation)}`, (event) =>
      requestMatches(event, expectation)
    )
  },
  toHavePatchedElements(expectation) {
    return expectFlightEvent(flight, `element patch ${describeExpectation(expectation)}`, (event) =>
      patchElementsMatches(event, expectation)
    )
  },
  toHavePatchedSignals(signals, expectation = {}) {
    return expectFlightEvent(
      flight,
      `signal patch ${describeExpectation({ signals, ...expectation })}`,
      (event) => patchSignalsMatches(event, signals, expectation)
    )
  },
  toHavePatchedSignalSource(source, expectation = {}) {
    return expectFlightEvent(
      flight,
      `raw signal patch ${describeExpectation({ source, ...expectation })}`,
      (event) => patchSignalSourceMatches(event, source, expectation)
    )
  },
  toHaveBrowserUserEvent(expectation) {
    return expectFlightEvent(
      flight,
      `browser user event ${describeExpectation(expectation)}`,
      (event) => browserUserEventMatches(event, expectation)
    )
  },
  toHaveBrowserSignalPatch(signals) {
    return expectFlightEvent(
      flight,
      `browser signal patch ${describeExpectation(signals)}`,
      (event) => browserSignalPatchMatches(event, signals)
    )
  },
  toHaveDomMutation(expectation = {}) {
    return expectFlightEvent(flight, `DOM mutation ${describeExpectation(expectation)}`, (event) =>
      domMutationEventMatches(event, expectation)
    )
  },
  toHaveNoSignalErrors() {
    const errorCount: number = flight.events.filter(hasSignalError).length
    if (errorCount > 0) {
      throw new DatastarFlightAssertionError(
        `Expected Datastar flight not to contain signal errors, found ${errorCount}`,
        flight
      )
    }
  }
})

/**
 * Creates semantic assertions for a single Datastar response without consuming its body.
 */
export const assertDatastarResponse = (response: Response): DatastarResponseAssertions => {
  const flight = inspectDatastarResponse(response).then((events): DatastarFlight => ({ events }))
  const assertions = flight.then(assertDatastarFlight)

  return {
    flight() {
      return flight
    },
    async format() {
      return formatDatastarFlight(await flight)
    },
    async toHavePatchedElements(expectation) {
      return (await assertions).toHavePatchedElements(expectation)
    },
    async toHavePatchedSignals(signals, expectation) {
      return (await assertions).toHavePatchedSignals(signals, expectation)
    },
    async toHavePatchedSignalSource(source, expectation) {
      return (await assertions).toHavePatchedSignalSource(source, expectation)
    },
    async toHaveNoSignalErrors() {
      return (await assertions).toHaveNoSignalErrors()
    }
  }
}

/**
 * Installs a fetch wrapper that records Datastar requests and responses in browser-like tests.
 */
export const installDatastarFetchRecorder = (
  options: DatastarFetchRecorderOptions = {}
): DatastarFetchRecorderInstallation => {
  const recorder = options.recorder ?? createDatastarFlightRecorder()
  const include = options.include ?? isDatastarFetchRequest
  const target = options.target ?? globalThis
  const originalFetch = target.fetch
  const callOriginalFetch: typeof fetch = originalFetch.bind(target)
  const pending = new Set<Promise<void>>()

  const track = (promise: Promise<void>): void => {
    pending.add(promise)
    void promise.finally(() => {
      pending.delete(promise)
    })
  }

  const recordableRequest = (args: Parameters<typeof fetch>): Request | undefined => {
    let request: Request
    try {
      request = requestFromFetchArgs(...args)
    } catch {
      return undefined
    }

    return include(request) ? request : undefined
  }

  const recordRequest = async (request: Request): Promise<void> => {
    try {
      await recorder.recordRequest(request)
    } catch (error) {
      recorder.recordEvent(fetchErrorEvent(error, request))
    }
  }

  const recordResponse = async (response: Response, request?: Request): Promise<void> => {
    try {
      await recorder.recordResponse(response.clone())
    } catch (error) {
      recorder.recordEvent(fetchErrorEvent(error, request))
    }
  }

  const wrappedFetch: typeof fetch = async (...args) => {
    const request = recordableRequest(args)
    if (request !== undefined) await recordRequest(request)

    try {
      const response = await callOriginalFetch(...args)
      if (request !== undefined) track(recordResponse(response, request))
      return response
    } catch (error) {
      if (request !== undefined) recorder.recordEvent(fetchErrorEvent(error, request))
      throw error
    }
  }

  target.fetch = wrappedFetch

  return {
    recorder,
    async flush() {
      while (pending.size > 0) {
        await Promise.all(pending)
      }
    },
    uninstall() {
      if (target.fetch === wrappedFetch) {
        target.fetch = originalFetch
      }
    }
  }
}

const defaultBrowserUserEvents = ["click", "submit", "input", "change"] as const

const browserDocument = (): Document | undefined =>
  typeof document === "undefined" ? undefined : document

const browserMutationObserver = (): typeof MutationObserver | undefined =>
  typeof MutationObserver === "undefined" ? undefined : MutationObserver

/**
 * Installs browser-side Flight Recorder hooks for user events, Datastar signal patches, DOM
 * mutations, and Datastar fetches.
 */
export const installDatastarBrowserRecorder = (
  options: DatastarBrowserRecorderOptions = {}
): DatastarBrowserRecorderInstallation => {
  const recorder = options.recorder ?? createDatastarFlightRecorder()
  const fetchInstallation = installDatastarFetchRecorder({
    recorder,
    ...(options.include === undefined ? {} : { include: options.include }),
    ...(options.target === undefined ? {} : { target: options.target })
  })
  const documentTarget = options.document ?? browserDocument()
  const cleanup: Array<() => void> = []

  if (documentTarget !== undefined) {
    const userEvents =
      options.userEvents === undefined ? defaultBrowserUserEvents : options.userEvents

    if (userEvents !== false) {
      for (const eventName of userEvents) {
        const listener = (event: Event) => {
          const recorded = browserUserEvent(event)
          if (recorded !== undefined) recorder.recordEvent(recorded)
        }
        documentTarget.addEventListener(eventName, listener, true)
        cleanup.push(() => documentTarget.removeEventListener(eventName, listener, true))
      }
    }

    if (options.signalPatches !== false) {
      const listener = (event: Event) => {
        recorder.recordEvent(browserSignalPatchEvent(event))
      }
      documentTarget.addEventListener("datastar-signal-patch", listener)
      cleanup.push(() => documentTarget.removeEventListener("datastar-signal-patch", listener))
    }

    if (options.domMutations !== false) {
      const Observer = options.mutationObserver ?? browserMutationObserver()
      const target = options.mutationTarget ?? documentTarget.documentElement ?? documentTarget.body

      if (Observer !== undefined && target !== undefined) {
        const observer = new Observer((records) => {
          const event = domMutationEvent(records)
          if (event !== undefined) recorder.recordEvent(event)
        })
        observer.observe(target, {
          attributeOldValue: true,
          attributes: true,
          characterData: true,
          characterDataOldValue: true,
          childList: true,
          subtree: true
        })
        cleanup.push(() => observer.disconnect())
      }
    }
  }

  return {
    recorder,
    async flush() {
      await fetchInstallation.flush()
    },
    uninstall() {
      for (const dispose of cleanup.splice(0)) {
        dispose()
      }
      fetchInstallation.uninstall()
    }
  }
}

/**
 * Creates a handler-level Flight Recorder for Datastar request/response tests.
 */
export const createDatastarFlightRecorder = (): DatastarFlightRecorder => {
  const events: DatastarFlightEvent[] = []

  const recorder: DatastarFlightRecorder = {
    assert() {
      return assertDatastarFlight(recorder.flight())
    },
    clear() {
      events.length = 0
    },
    flight() {
      return { events: [...events] }
    },
    format() {
      return formatDatastarFlight(recorder.flight())
    },
    recordEvent(event) {
      events.push(event)
    },
    async recordRequest(request) {
      const event = await inspectDatastarRequest(request)
      events.push(event)
      return event
    },
    async recordResponse(response) {
      events.push(...(await inspectDatastarResponse(response)))
      return response
    },
    async handle(request, handler) {
      await recorder.recordRequest(request)
      const response = await handler(request)
      await recorder.recordResponse(response)
      return response
    }
  }

  return recorder
}
