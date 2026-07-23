import type { DatastarDebuggerEventEntry } from "./types.js"

const MAX_DEBUG_STRING_LENGTH = 2_000
const HTML_VOID_ELEMENTS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
])
const noSignalMatch = Symbol("noSignalMatch")

const toElementLabel = (value: unknown): string => {
  if (!value) return "document"
  if (typeof Element !== "undefined" && value instanceof Element) {
    return value.id ? `#${value.id}` : `<${value.tagName.toLowerCase()}>`
  }
  return "element"
}

const toDebugValue = (value: unknown, seen = new WeakSet()): unknown => {
  if (typeof value === "string") {
    return value.length > MAX_DEBUG_STRING_LENGTH
      ? `${value.slice(0, MAX_DEBUG_STRING_LENGTH)}… truncated`
      : value
  }
  if (typeof value === "function") return "[Function]"
  if (typeof value === "bigint") return `${value}n`
  if (typeof Element !== "undefined" && value instanceof Element) return toElementLabel(value)
  if (!value || typeof value !== "object") return value
  if (seen.has(value)) return "[Circular]"

  seen.add(value)
  const result: unknown = Array.isArray(value)
    ? value.map((item) => toDebugValue(item, seen))
    : Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, toDebugValue(item, seen)])
      )
  seen.delete(value)
  return result
}

const toDebugRecord = (value: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const result = toDebugValue(value)
  if (!result || typeof result !== "object" || Array.isArray(result)) return {}
  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(result)) output[key] = item
  return output
}

const cloneSignals = (value: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) {
    try {
      const json = JSON.stringify(item)
      if (json !== undefined) output[key] = JSON.parse(json)
    } catch {
      // A signal that cannot round-trip through JSON cannot be restored safely.
    }
  }
  return output
}

const toDebugJson = (value: unknown): string => {
  try {
    const json = JSON.stringify(value, null, 2)
    return json === undefined ? String(value) : json
  } catch {
    return String(value)
  }
}

const htmlOpeningLines = (element: Element, indent: string): string[] => {
  const tag = element.tagName.toLowerCase()
  const attributes = Array.from(element.attributes).map((attribute) => {
    const quote = attribute.value.includes('"') && !attribute.value.includes("'") ? "'" : '"'
    const value =
      quote === '"'
        ? attribute.value.replaceAll('"', "&quot;")
        : attribute.value.replaceAll("'", "&#39;")
    return `${attribute.name}=${quote}${value}${quote}`
  })
  const opening = `<${tag}${attributes.length > 0 ? ` ${attributes.join(" ")}` : ""}>`
  if (opening.length <= 80) return [indent + opening]
  return [
    `${indent}<${tag}`,
    ...attributes.map((attribute) => `${indent}  ${attribute}`),
    `${indent}>`
  ]
}

const formatPatchHtml = (html: string): string => {
  const template = document.createElement("template")
  template.innerHTML = html
  const lines: string[] = []

  const appendNode = (node: Node, depth = 0): void => {
    const indent = "  ".repeat(depth)
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim()
      if (text) lines.push(indent + text)
      return
    }
    if (node.nodeType === Node.COMMENT_NODE) {
      lines.push(`${indent}<!--${node.textContent ?? ""}-->`)
      return
    }
    if (!(node instanceof Element)) return

    const tag = node.tagName.toLowerCase()
    const children = Array.from(node.childNodes)
    const opening = htmlOpeningLines(node, indent)
    if (HTML_VOID_ELEMENTS.has(tag)) {
      lines.push(...opening)
      return
    }

    const onlyChild = children.length === 1 ? children[0] : undefined
    if (opening.length === 1 && onlyChild?.nodeType === Node.TEXT_NODE) {
      const line = `${opening[0]}${onlyChild.textContent?.trim() ?? ""}</${tag}>`
      if (line.length <= 120) {
        lines.push(line)
        return
      }
    }

    lines.push(...opening)
    for (const child of children) appendNode(child, depth + 1)
    lines.push(`${indent}</${tag}>`)
  }

  for (const child of Array.from(template.content.childNodes)) appendNode(child)
  return lines.join("\n") || html
}

const patchTarget = (
  type: string,
  argsRaw: Readonly<Record<string, unknown>>
): string | undefined => {
  if (type !== "datastar-patch-elements") return undefined
  const selector = typeof argsRaw.selector === "string" ? argsRaw.selector.trim() : ""
  if (selector) return selector

  const elements = typeof argsRaw.elements === "string" ? argsRaw.elements : ""
  if (!elements) return undefined
  const template = document.createElement("template")
  template.innerHTML = elements
  const ids = Array.from(template.content.children)
    .map((element) => (element.id ? `#${element.id}` : ""))
    .filter(Boolean)
  return ids.length > 0 ? ids.join(", ") : undefined
}

const parseJsonString = (value: unknown): unknown => {
  if (typeof value !== "string") return value
  const trimmed = value.trim()
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value
  try {
    return JSON.parse(trimmed)
  } catch {
    return value
  }
}

const eventForDisplay = (event: DatastarDebuggerEventEntry): DatastarDebuggerEventEntry =>
  event.kind === "fetch"
    ? { ...event, argsRaw: { ...event.argsRaw, signals: parseJsonString(event.argsRaw.signals) } }
    : event

const eventText = (event: DatastarDebuggerEventEntry): string => {
  const display = eventForDisplay(event)
  return display.kind === "signal"
    ? [display.at, "signal patch", toDebugJson(display.patch)].join(" ")
    : [
        display.at,
        display.type,
        display.element,
        display.target ?? "",
        toDebugJson(display.argsRaw),
        toDebugJson(display.signals ?? {})
      ].join(" ")
}

const createMatcher = (search: string): ((value: unknown) => boolean) => {
  if (!search) return () => true
  if (search.startsWith("/") && search.lastIndexOf("/") > 0) {
    const slash = search.lastIndexOf("/")
    try {
      const regex = new RegExp(search.slice(1, slash), search.slice(slash + 1).replace(/[gy]/g, ""))
      return (value) => regex.test(String(value))
    } catch {
      return () => false
    }
  }
  const lowered = search.toLowerCase()
  return (value) => String(value).toLowerCase().includes(lowered)
}

const pruneSignals = (value: unknown, matches: (value: unknown) => boolean, path = ""): unknown => {
  if (matches(path)) return value
  if (!value || typeof value !== "object") {
    return matches(`${path} ${toDebugJson(value)}`) ? value : noSignalMatch
  }

  const output: Record<string, unknown> | unknown[] = Array.isArray(value) ? [] : {}
  let matched = false
  for (const [key, item] of Object.entries(value)) {
    const child = pruneSignals(item, matches, path ? `${path}.${key}` : key)
    if (child === noSignalMatch) continue
    if (Array.isArray(output)) output.push(child)
    else output[key] = child
    matched = true
  }
  return matched ? output : noSignalMatch
}

/** Serialization and search operations used by the debugger. */
export const DebuggerFormat = {
  cloneSignals,
  createMatcher,
  eventForDisplay,
  eventText,
  formatPatchHtml,
  filterSignals: (signals: Readonly<Record<string, unknown>>, search: string): unknown =>
    search ? pruneSignals(signals, createMatcher(search)) : signals,
  isNoSignalMatch: (value: unknown): boolean => value === noSignalMatch,
  nowLabel: (): string => new Date().toLocaleTimeString(),
  patchTarget,
  toDebugJson,
  toDebugRecord,
  toDebugValue,
  toElementLabel
}
