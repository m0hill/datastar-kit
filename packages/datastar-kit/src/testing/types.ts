import type { SseEventOptions } from "../sse.js"
import type { SignalState } from "../types.js"

export type DatastarFlightEventSource = "server" | "browser"

export interface DatastarFlightEventMeta {
  readonly source?: DatastarFlightEventSource
  readonly sequence?: number
  readonly timestamp?: number
}

export type MutableFlightEventMeta = {
  -readonly [Key in keyof DatastarFlightEventMeta]: DatastarFlightEventMeta[Key]
}

export type DatastarFlightEvent = DatastarFlightEventMeta &
  (
    | DatastarRequestEvent
    | DatastarResponseEvent
    | DatastarResponseDoneEvent
    | DatastarResponseBodyTruncatedEvent
    | DatastarDirectHtmlEvent
    | DatastarDirectSignalsEvent
    | DatastarDirectScriptEvent
    | DatastarPatchElementsEvent
    | DatastarPatchSignalsEvent
    | DatastarFetchErrorEvent
    | DatastarHandlerErrorEvent
    | DatastarBrowserUserEvent
    | DatastarBrowserSignalPatchEvent
    | DatastarDomMutationEvent
    | DatastarUnknownSseEvent
  )

export interface DatastarFlight {
  readonly events: readonly DatastarFlightEvent[]
}

interface DatastarRequestBaseEvent {
  readonly type: "request"
  readonly method: string
  readonly url: string
}

export type DatastarRecordedSignals =
  | { readonly signals: SignalState; readonly signalError?: never }
  | { readonly signals?: never; readonly signalError: DatastarRecordedError }

export type DatastarOptionalRecordedSignals =
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

export interface DatastarResponseBodyTruncatedEvent {
  readonly type: "response.body.truncated"
  readonly reason: "timeout" | "maxBytes"
  readonly bytesRead: number
  readonly maxBytes?: number
  readonly timeoutMs?: number
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

export type DatastarRequestTarget = Partial<Pick<DatastarRequestEvent, "method" | "url">>
export type DatastarErrorEventType = "fetch.error" | "handler.error"

export type DatastarErrorEvent<Type extends DatastarErrorEventType> = DatastarRequestTarget & {
  readonly type: Type
  readonly error: DatastarRecordedError
}

export type DatastarFetchErrorEvent = DatastarErrorEvent<"fetch.error">

export type DatastarHandlerErrorEvent = DatastarErrorEvent<"handler.error">

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

export type TextExpectation<T extends string | undefined> = Exclude<T, undefined> | RegExp
export type TextExpectations<Source, Keys extends keyof Source> = Partial<{
  readonly [Key in Keys]: TextExpectation<Extract<Source[Key], string | undefined>>
}>
export type SignalExpectation = Readonly<Record<string, unknown>>

export type DatastarRequestExpectation = TextExpectations<DatastarRequestEvent, "url"> &
  Partial<Pick<DatastarRequestEvent, "method"> & { readonly signals: SignalExpectation }>

export type DatastarPatchElementsExpectation = TextExpectations<
  DatastarPatchElementsEvent,
  "elements" | "selector" | "viewTransitionSelector"
> &
  Partial<Pick<DatastarPatchElementsEvent, "mode" | "namespace" | "useViewTransition">>

export type DatastarPatchSignalsExpectation = Partial<
  Pick<DatastarPatchSignalsEvent, "onlyIfMissing">
>

export type DatastarDirectHtmlExpectation = TextExpectations<
  DatastarDirectHtmlEvent,
  "html" | "selector" | "mode" | "namespace"
> &
  Partial<Pick<DatastarDirectHtmlEvent, "useViewTransition">>

export type DatastarDirectSignalsExpectation = Partial<
  Pick<DatastarDirectSignalsEvent, "onlyIfMissing">
>

export type DatastarDirectScriptExpectation = TextExpectations<
  DatastarDirectScriptEvent,
  "script"
> &
  Partial<{ readonly attributes: Readonly<Record<string, unknown>> }>

export type DatastarBrowserUserExpectation = Partial<Pick<DatastarBrowserUserEvent, "event">> &
  TextExpectations<DatastarBrowserUserEvent, "target" | "datastarAttribute" | "expression">

export type DatastarDomMutationExpectation = Partial<Pick<DatastarDomMutation, "type">> &
  TextExpectations<DatastarDomMutation, "target" | "attributeName" | "text">

export interface DatastarFlightAssertions {
  toHaveRequested(expectation: DatastarRequestExpectation): DatastarRequestEvent
  toHaveDirectHtml(expectation: DatastarDirectHtmlExpectation): DatastarDirectHtmlEvent
  toHaveDirectSignals(
    signals: SignalExpectation,
    expectation?: DatastarDirectSignalsExpectation
  ): DatastarDirectSignalsEvent
  toHaveDirectSignalSource(
    source: TextExpectation<DatastarDirectSignalsEvent["signalsSource"]>,
    expectation?: DatastarDirectSignalsExpectation
  ): DatastarDirectSignalsEvent
  toHaveDirectScript(expectation: DatastarDirectScriptExpectation): DatastarDirectScriptEvent
  toHaveCompleted(): DatastarResponseDoneEvent
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

export type AsyncFlightAssertions<Keys extends keyof DatastarFlightAssertions> = {
  [Key in Keys]: DatastarFlightAssertions[Key] extends (...args: infer Args) => infer Result
    ? (...args: Args) => Promise<Result>
    : never
}

export type DatastarResponseAssertionName = Exclude<
  keyof DatastarFlightAssertions,
  "toHaveRequested" | "toHaveBrowserUserEvent" | "toHaveBrowserSignalPatch" | "toHaveDomMutation"
>

export type DatastarResponseAssertions = AsyncFlightAssertions<DatastarResponseAssertionName> & {
  flight(): Promise<DatastarFlight>
  format(): Promise<string>
}

export interface DatastarResponseInspectionOptions {
  /** Maximum response-body bytes inspected before a truncation event is recorded. */
  readonly maxBytes?: number
  /** Maximum response-body read time before a truncation event is recorded. */
  readonly timeoutMs?: number
}

export interface DatastarFlightRecorderOptions {
  /** Optional source label attached to events recorded by this recorder. */
  readonly source?: DatastarFlightEventSource
  /** Whether to attach monotonically increasing sequence numbers to recorded events. */
  readonly sequence?: boolean
  /** Optional timestamp source. `true` uses `Date.now()`. */
  readonly timestamp?: boolean | (() => number)
  /** Default response-body inspection limits used by `recordResponse()` and `handle()`. */
  readonly inspectResponse?: DatastarResponseInspectionOptions
}

export interface DatastarFlightRecorder {
  assert(): DatastarFlightAssertions
  clear(): void
  flight(): DatastarFlight
  format(): string
  recordEvent(event: DatastarFlightEvent): void
  recordRequest(request: Request): Promise<DatastarRequestEvent>
  recordResponse(response: Response, options?: DatastarResponseInspectionOptions): Promise<Response>
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
  /** Response-body inspection limits for recorded responses. */
  readonly inspectResponse?: DatastarResponseInspectionOptions
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

export type DatastarBrowserRecorderScriptOptions = Pick<
  DatastarBrowserRecorderOptions,
  "userEvents" | "signalPatches" | "domMutations"
> & {
  /** Browser module specifier that exports `installDatastarBrowserRecorder`. */
  readonly module?: string
  /** Global property that receives the recorder installation. */
  readonly globalName?: string
  /** Whether browser fetches should be recorded. Disable this when the server is recorded separately. */
  readonly fetches?: boolean
}

export interface InjectDatastarBrowserRecorderOptions extends DatastarBrowserRecorderScriptOptions {
  /** When true, returns the original HTML if it already references the configured global name. */
  readonly skipIfPresent?: boolean
}

export interface DatastarFlightMergeOptions {
  /** Sort merged events by timestamp when timestamps are available. @defaultValue `true` */
  readonly sortByTimestamp?: boolean
}

export interface RawSseEvent {
  readonly event?: string
  readonly id?: string
  readonly retry?: number
  readonly dataLines: readonly string[]
}
