export type ElementPatchMode =
  | "outer"
  | "inner"
  | "remove"
  | "replace"
  | "prepend"
  | "append"
  | "before"
  | "after"

export type ElementNamespace = "html" | "svg" | "mathml"

export interface SseOptions {
  readonly id?: string
  readonly retry?: number
}

export interface PatchElementsOptions extends SseOptions {
  readonly selector?: string
  readonly mode?: ElementPatchMode
  readonly namespace?: ElementNamespace
  readonly useViewTransition?: boolean
}

export interface PatchSignalsOptions extends SseOptions {
  readonly onlyIfMissing?: boolean
}

export interface ExecuteScriptOptions extends SseOptions {
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
  readonly autoRemove?: boolean
}

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue }
export type JsonObject = { readonly [key: string]: JsonValue }

const PATCH_ELEMENTS_EVENT = "datastar-patch-elements"
const PATCH_SIGNALS_EVENT = "datastar-patch-signals"

interface EventLine {
  readonly key: string
  readonly value: string
}

const splitLines = (value: string): ReadonlyArray<string> => value.split("\n")

const dataLines = (key: string, value: string): ReadonlyArray<EventLine> =>
  splitLines(value).map((line) => ({ key, value: line }))

const serializeEvent = (event: string, options: SseOptions, lines: ReadonlyArray<EventLine>): string => {
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

export const encodeJson = (value: JsonObject | string): string =>
  typeof value === "string" ? value : JSON.stringify(value)

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

  lines.push(...dataLines("elements", elements))

  return serializeEvent(PATCH_ELEMENTS_EVENT, options, lines)
}

export const patchSignals = (signals: JsonObject | string, options: PatchSignalsOptions = {}): string => {
  const lines: Array<EventLine> = []

  if (options.onlyIfMissing === true) {
    lines.push({ key: "onlyIfMissing", value: "true" })
  }

  lines.push(...dataLines("signals", encodeJson(signals)))

  return serializeEvent(PATCH_SIGNALS_EVENT, options, lines)
}

const escapeAttribute = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const scriptAttributes = (options: ExecuteScriptOptions): string => {
  const attrs: Array<string> = []

  if (options.autoRemove !== false) {
    attrs.push('data-effect="el.remove()"')
  }

  for (const [key, value] of Object.entries(options.attributes ?? {})) {
    attrs.push(`${key}="${escapeAttribute(String(value))}"`)
  }

  return attrs.length === 0 ? "" : ` ${attrs.join(" ")}`
}

export const executeScript = (script: string, options: ExecuteScriptOptions = {}): string => {
  const elements = `<script${scriptAttributes(options)}>${script}</script>`
  return serializeEvent(PATCH_ELEMENTS_EVENT, options, [
    { key: "mode", value: "append" },
    { key: "selector", value: "body" },
    ...dataLines("elements", elements)
  ])
}

export const eventStream = (...events: ReadonlyArray<string>): string => events.join("")
