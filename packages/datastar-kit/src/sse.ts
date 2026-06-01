import type { SignalState } from "./types.js"
import { assertHtmlAttributeName, escapeHtmlAttribute } from "./html.js"

export type { SignalState, SignalValue } from "./types.js"

/**
 * Datastar patch-elements modes for applying returned HTML to the current document.
 *
 * @see https://data-star.dev/reference/sse_events#datastar-patch-elements
 */
export type PatchElementsMode =
  | "outer"
  | "inner"
  | "remove"
  | "replace"
  | "prepend"
  | "append"
  | "before"
  | "after"

/**
 * Datastar patch-elements namespace used when parsing returned markup.
 *
 * @see https://data-star.dev/reference/sse_events#datastar-patch-elements
 */
export type PatchElementsNamespace = "html" | "svg" | "mathml"

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

const PATCH_ELEMENTS_EVENT = "datastar-patch-elements"
const PATCH_SIGNALS_EVENT = "datastar-patch-signals"

interface EventLine {
  readonly key: string
  readonly value: string
}

const splitLines = (value: string): ReadonlyArray<string> => value.split("\n")

const dataLines = (key: string, value: string): ReadonlyArray<EventLine> =>
  splitLines(value).map((line) => ({ key, value: line }))

const serializeEvent = (
  event: string,
  options: SseEventOptions,
  lines: ReadonlyArray<EventLine>
): string => {
  const out = [`event: ${event}`]

  if (options.id !== undefined) {
    out.push(`id: ${options.id}`)
  }

  if (options.retry !== undefined) {
    out.push(`retry: ${options.retry}`)
  }

  for (const line of lines) {
    out.push(`data: ${line.key} ${line.value}`)
  }

  return `${out.join("\n")}\n\n`
}

const encodeSignals = (value: SignalState | string): string =>
  typeof value === "string" ? value : JSON.stringify(value)

const scriptAttributes = (options: ExecuteScriptOptions): string => {
  const attrs: Array<string> = []

  if (options.autoRemove !== false) {
    attrs.push('data-effect="el.remove()"')
  }

  for (const [key, value] of Object.entries(options.attributes ?? {})) {
    assertHtmlAttributeName(key)
    attrs.push(`${key}="${escapeHtmlAttribute(String(value))}"`)
  }

  return attrs.length === 0 ? "" : ` ${attrs.join(" ")}`
}

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
    lines.push({ key: "selector", value: options.selector })
  }

  if (options.mode !== undefined && options.mode !== "outer") {
    lines.push({ key: "mode", value: options.mode })
  }

  if (options.namespace !== undefined && options.namespace !== "html") {
    lines.push({ key: "namespace", value: options.namespace })
  }

  if (options.useViewTransition === true) {
    lines.push({ key: "useViewTransition", value: "true" })
  }

  if (options.mode !== "remove") {
    lines.push(...dataLines("elements", elements))
  }

  return serializeEvent(PATCH_ELEMENTS_EVENT, options, lines)
}

/**
 * Encodes a Datastar `datastar-patch-signals` SSE event.
 *
 * @param signals Signal state or raw serialized signal patch source.
 * @param options Datastar patch-signals event options.
 * @returns A complete SSE event string.
 * @see https://data-star.dev/reference/sse_events#datastar-patch-signals
 */
export const patchSignals = (
  signals: SignalState | string,
  options: PatchSignalsOptions = {}
): string => {
  const lines: Array<EventLine> = []

  if (options.onlyIfMissing === true) {
    lines.push({ key: "onlyIfMissing", value: "true" })
  }

  lines.push(...dataLines("signals", encodeSignals(signals)))

  return serializeEvent(PATCH_SIGNALS_EVENT, options, lines)
}

/**
 * Encodes a Datastar script execution event.
 *
 * @remarks
 * This helper sends JavaScript to the browser. Only pass script text produced by trusted
 * application code. Do not include unsanitized user input in generated scripts.
 *
 * @param script JavaScript source to execute in the browser.
 * @param options Script execution event options.
 * @returns A complete SSE event string.
 */
export const executeScript = (script: string, options: ExecuteScriptOptions = {}): string => {
  const elements = `<script${scriptAttributes(options)}>${script}</script>`
  return serializeEvent(PATCH_ELEMENTS_EVENT, options, [
    { key: "mode", value: "append" },
    { key: "selector", value: "body" },
    ...dataLines("elements", elements)
  ])
}
