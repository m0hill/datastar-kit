import { renderHtmlAttributes } from "./html.js"
import type { SignalState } from "./types.js"

/** @internal */
export const patchElementsModes = [
  "outer",
  "inner",
  "remove",
  "replace",
  "prepend",
  "append",
  "before",
  "after"
] as const

/**
 * Datastar patch-elements modes for applying returned HTML to the current document.
 *
 * @see https://data-star.dev/reference/sse_events#datastar-patch-elements
 */
export type PatchElementsMode = (typeof patchElementsModes)[number]

/** @internal */
export const patchElementsNamespaces = ["html", "svg", "mathml"] as const

/**
 * Datastar patch-elements namespace used when parsing returned markup.
 *
 * @see https://data-star.dev/reference/sse_events#datastar-patch-elements
 */
export type PatchElementsNamespace = (typeof patchElementsNamespaces)[number]

/**
 * Fields shared by Datastar SSE events.
 */
export interface SseEventOptions {
  /** Event ID sent through the SSE `id:` field. */
  readonly id?: string
  /** Retry delay in milliseconds sent through the SSE `retry:` field. */
  readonly retry?: number
}

/**
 * Options for a `datastar-patch-elements` SSE event.
 *
 * @see https://data-star.dev/reference/sse_events#datastar-patch-elements
 */
export interface PatchElementsOptions extends SseEventOptions {
  /** CSS selector for the elements that should receive the patch. */
  readonly selector?: string
  /** Patch operation used to merge returned elements into the DOM. @defaultValue `"outer"` */
  readonly mode?: PatchElementsMode
  /** Markup namespace used to parse the returned elements. @defaultValue `"html"` */
  readonly namespace?: PatchElementsNamespace
  /** Whether Datastar should use the View Transition API when applying the patch. */
  readonly useViewTransition?: boolean
  /**
   * CSS selector for the element whose scoped View Transition API should apply the patch. Requires
   * Datastar 1.0.2 or newer; older runtimes ignore it.
   */
  readonly viewTransitionSelector?: string
}

/**
 * Options for a `datastar-patch-signals` SSE event.
 *
 * @see https://data-star.dev/reference/sse_events#datastar-patch-signals
 */
export interface PatchSignalsOptions extends SseEventOptions {
  /** Whether signal keys should only be patched when they do not already exist. */
  readonly onlyIfMissing?: boolean
}

/**
 * Options for a script execution event encoded as a patch-elements event.
 */
export interface ExecuteScriptOptions extends SseEventOptions {
  /** Attributes rendered on the generated `<script>` element. */
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
  /** Whether the generated script removes itself after running. @defaultValue `true` */
  readonly autoRemove?: boolean
}

/** @internal */
export const PATCH_ELEMENTS_EVENT = "datastar-patch-elements"
/** @internal */
export const PATCH_SIGNALS_EVENT = "datastar-patch-signals"

/**
 * @internal Values Datastar assumes when an event leaves a field out. The encoder omits fields equal
 * to these, so a decoder must fill them back in.
 */
export const datastarDefaults = {
  retry: 1000,
  mode: "outer",
  namespace: "html"
} as const satisfies {
  readonly retry: number
  readonly mode: PatchElementsMode
  readonly namespace: PatchElementsNamespace
}

/**
 * Error thrown when an SSE field value would corrupt the line-oriented SSE protocol: a line break or
 * other control character in a single-line field, or a retry delay that is not whole milliseconds.
 */
export class SseFieldError extends Error {
  constructor(
    readonly field: string,
    readonly value: string
  ) {
    super(`Invalid Datastar SSE ${field} value: ${JSON.stringify(value)}`)
  }
}

interface EventLine {
  readonly key: string
  readonly value: string
}

// SSE fields are single lines; CR/LF or other control chars would let a value
// inject extra protocol lines or forged events.
const controlCharPattern = /[\u0000-\u001F\u007F]/u

const assertSseField = (field: string, value: string): void => {
  if (controlCharPattern.test(value)) {
    throw new SseFieldError(field, value)
  }
}

// SSE parsers treat CRLF, bare CR, and bare LF as line breaks.
const sseLineBreakPattern = /\r\n|\r|\n/u
const splitLines = (value: string): ReadonlyArray<string> => value.split(sseLineBreakPattern)

/**
 * Encodes an SSE comment chunk.
 *
 * @remarks
 * Comments are ignored by the browser's `EventSource` parser but are useful as manual heartbeats
 * in long-lived streams. Multiline comments are split so every physical SSE line remains a
 * comment line.
 *
 * @param text Optional comment text after the `:` SSE comment prefix.
 * @returns A complete SSE comment chunk.
 */
export const comment = (text = ""): string =>
  `${splitLines(text)
    .map((line) => (line.length === 0 ? ":" : `: ${line}`))
    .join("\n")}\n\n`

const dataLines = (key: string, value: string): ReadonlyArray<EventLine> =>
  splitLines(value).map((line) => ({ key, value: line }))

const serializeEvent = (
  event: string,
  options: SseEventOptions,
  lines: ReadonlyArray<EventLine>
): string => {
  const out = [`event: ${event}`]

  if (options.id !== undefined) {
    assertSseField("id", options.id)
    out.push(`id: ${options.id}`)
  }

  if (options.retry !== undefined && options.retry !== datastarDefaults.retry) {
    // EventSource ignores a retry field that is not a run of ASCII digits.
    if (!Number.isSafeInteger(options.retry) || options.retry < 0) {
      throw new SseFieldError("retry", String(options.retry))
    }
    out.push(`retry: ${options.retry}`)
  }

  for (const line of lines) {
    out.push(`data: ${line.key} ${line.value}`)
  }

  return `${out.join("\n")}\n\n`
}

const scriptAttributes = (options: ExecuteScriptOptions): string =>
  renderHtmlAttributes(
    options.autoRemove === false
      ? { ...options.attributes }
      : { ...options.attributes, "data-effect": "el.remove()" }
  )

// A trusted script may legitimately contain these sequences inside string,
// template, or regex literals. Escaping them preserves JavaScript semantics in
// those contexts while preventing the HTML parser from treating them as script
// structure.
const escapeScriptBody = (script: string): string =>
  script.replaceAll(/<\/(script)/giu, "<\\/$1").replaceAll("<!--", "<\\!--")

/**
 * Encodes a Datastar `datastar-patch-elements` SSE event.
 *
 * @param elements Serialized HTML elements to patch into the document.
 * @param options Datastar patch-elements event options.
 * @returns A complete SSE event string.
 * @see https://data-star.dev/reference/sse_events#datastar-patch-elements
 */
export const patchElements = (elements: string, options: PatchElementsOptions = {}): string => {
  const lines: Array<EventLine> = []

  if (options.selector !== undefined) {
    assertSseField("selector", options.selector)
    lines.push({ key: "selector", value: options.selector })
  }

  if (options.mode !== undefined && options.mode !== datastarDefaults.mode) {
    lines.push({ key: "mode", value: options.mode })
  }

  if (options.useViewTransition === true) {
    lines.push({ key: "useViewTransition", value: "true" })

    if (options.viewTransitionSelector !== undefined) {
      assertSseField("viewTransitionSelector", options.viewTransitionSelector)
      lines.push({ key: "viewTransitionSelector", value: options.viewTransitionSelector })
    }
  }

  if (options.namespace !== undefined && options.namespace !== datastarDefaults.namespace) {
    lines.push({ key: "namespace", value: options.namespace })
  }

  if (options.mode !== "remove") {
    lines.push(...dataLines("elements", elements))
  }

  return serializeEvent(PATCH_ELEMENTS_EVENT, options, lines)
}

/** Options for a remove-mode patch-elements event; `removeElements` sets the selector and mode. */
export type RemoveElementsOptions = Omit<PatchElementsOptions, "selector" | "mode" | "namespace">

/**
 * Encodes a Datastar `datastar-patch-elements` SSE event that removes every element matching
 * `selector`.
 */
export const removeElements = (selector: string, options: RemoveElementsOptions = {}): string =>
  patchElements("", { ...options, selector, mode: "remove" })

/**
 * Encodes a Datastar `datastar-patch-signals` SSE event.
 *
 * @param signals Signal state to patch.
 * @param options Datastar patch-signals event options.
 * @returns A complete SSE event string.
 * @see https://data-star.dev/reference/sse_events#datastar-patch-signals
 */
export const patchSignals = (signals: SignalState, options: PatchSignalsOptions = {}): string => {
  const lines: Array<EventLine> = []

  if (options.onlyIfMissing === true) {
    lines.push({ key: "onlyIfMissing", value: "true" })
  }

  lines.push(...dataLines("signals", JSON.stringify(signals)))

  return serializeEvent(PATCH_SIGNALS_EVENT, options, lines)
}

/**
 * Encodes a Datastar script execution event.
 *
 * @remarks
 * This helper sends JavaScript to the browser. Only pass script text produced by trusted
 * application code. Do not include unsanitized user input in generated scripts. Prefer structured
 * element or signal patches when possible.
 *
 * @param script JavaScript source to execute in the browser.
 * @param options Script execution event options.
 * @returns A complete SSE event string.
 */
export const executeScript = (script: string, options: ExecuteScriptOptions = {}): string => {
  const elements = `<script${scriptAttributes(options)}>${escapeScriptBody(script)}</script>`
  return serializeEvent(PATCH_ELEMENTS_EVENT, options, [
    { key: "mode", value: "append" },
    { key: "selector", value: "body" },
    ...dataLines("elements", elements)
  ])
}
