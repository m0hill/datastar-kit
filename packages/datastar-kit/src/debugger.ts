import { h, type HtmlChild } from "./html.js"

export const DATASTAR_DEBUGGER_STATE_NAME = "_datastarKitDebugger" as const

export type DatastarDebuggerStateName = `_${string}`
export type DatastarDebuggerTab = "signals" | "events" | "timeline"

export interface DatastarDebuggerSignalPatchEntry {
  readonly at: string
  readonly kind: "signal"
  readonly patch: unknown
}

export interface DatastarDebuggerFetchEntry {
  readonly at: string
  readonly kind: "fetch"
  readonly type: string
  readonly element: string
  readonly target?: string
  readonly argsRaw: Readonly<Record<string, unknown>>
  readonly signals?: Readonly<Record<string, unknown>>
}

export type DatastarDebuggerEventEntry =
  | DatastarDebuggerSignalPatchEntry
  | DatastarDebuggerFetchEntry

export interface DatastarDebuggerSnapshotEntry {
  readonly at: string
  readonly label: string
  readonly html: string
  readonly signals: Readonly<Record<string, unknown>>
}

export interface DatastarDebuggerTravelState {
  /** Snapshot index shown while time traveling; the newest snapshot when live. */
  readonly index: number
  /** Whether the page is showing a restored snapshot instead of live state. */
  readonly active: boolean
  /** Whether a snapshot capture is already scheduled; coalesces patch bursts. */
  readonly pending: boolean
}

export interface DatastarDebuggerState {
  readonly tab: DatastarDebuggerTab
  readonly search: string
  readonly paused: boolean
  readonly events: readonly DatastarDebuggerEventEntry[]
  readonly snapshots: readonly DatastarDebuggerSnapshotEntry[]
  readonly travel: DatastarDebuggerTravelState
}

export interface DatastarDebuggerProps {
  /** Container `id`. @defaultValue `"datastar-kit-debugger"` */
  readonly id?: string
  /** Local signal name used by the debugger. Must be one underscore-prefixed root signal. */
  readonly stateName?: DatastarDebuggerStateName
  /** Whether the `<details>` panel starts open. @defaultValue `true` */
  readonly open?: boolean
  /** Maximum debugger events retained in browser signal state. @defaultValue `100` */
  readonly maxEvents?: number
  /** Maximum timeline snapshots retained in browser signal state. @defaultValue `50` */
  readonly maxSnapshots?: number
  /** Additional class on the debugger container. */
  readonly class?: string
  /** Additional class on the debugger container for JSX callers that prefer `className`. */
  readonly className?: string
  /** Inline style on the debugger container. */
  readonly style?: string
}

const DEBUGGER_CLASS = "datastar-kit-debugger"
const DEBUGGER_ID = "datastar-kit-debugger"
const DEFAULT_MAX_EVENTS = 100
const DEFAULT_MAX_SNAPSHOTS = 50
const MAX_DEBUG_STRING_LENGTH = 2_000
// Delay between a recorded patch and its timeline snapshot so the DOM settles
// first and bursts of patches coalesce into one snapshot.
const SNAPSHOT_SETTLE_MS = 80

const localStateNamePattern = /^_[A-Za-z][A-Za-z0-9_]*$/

const debuggerStyles = `
.${DEBUGGER_CLASS} {
  display: contents;
  color-scheme: dark;
  --dsk-bg: #000;
  --dsk-surface: #0c0c0c;
  --dsk-surface-2: #161616;
  --dsk-border: #1f1f1f;
  --dsk-border-strong: #333;
  --dsk-text: #ededed;
  --dsk-muted: #7d7d7d;
  --dsk-faint: #565656;
  --dsk-add: #5fb46a;
  --dsk-blue: #7aa2f7;
  --dsk-red: #f0666f;
  --dsk-mono: "SFMono-Regular", ui-monospace, "JetBrains Mono", Consolas, "Liberation Mono", monospace;
  font: 12px/1.5 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.${DEBUGGER_CLASS} * { box-sizing: border-box; }
.${DEBUGGER_CLASS} details {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 2147483647;
  width: min(92vw, 33rem);
  max-height: min(74vh, 38rem);
  overflow: auto;
  border: 1px solid var(--dsk-border);
  border-radius: 0.75rem;
  background: var(--dsk-bg);
  color: var(--dsk-text);
  box-shadow: 0 24px 70px -16px rgb(0 0 0 / 85%);
}
.${DEBUGGER_CLASS} details:not([open]) { width: auto; }
.${DEBUGGER_CLASS} summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
  cursor: pointer;
  padding: 0.8rem 1rem;
  list-style: none;
  user-select: none;
  transition: background 0.12s ease;
}
.${DEBUGGER_CLASS} summary:hover { background: var(--dsk-surface); }
.${DEBUGGER_CLASS} summary::-webkit-details-marker { display: none; }
.${DEBUGGER_CLASS} .dsk-debug-label {
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--dsk-text);
}
.${DEBUGGER_CLASS} .dsk-debug-pill:first-of-type { margin-left: auto; }
.${DEBUGGER_CLASS} .dsk-debug-pill {
  color: var(--dsk-muted);
  font-size: 11px;
  font-family: var(--dsk-mono);
  font-variant-numeric: tabular-nums;
}
.${DEBUGGER_CLASS} .dsk-debug-pill[data-kind="warn"] {
  color: var(--dsk-red);
  font-weight: 600;
}
.${DEBUGGER_CLASS} .dsk-debug-body {
  display: grid;
  gap: 1.1rem;
  padding: 1rem;
  border-top: 1px solid var(--dsk-border);
}
.${DEBUGGER_CLASS} .dsk-debug-controls {
  display: flex;
  gap: 0.45rem;
  align-items: stretch;
}
.${DEBUGGER_CLASS} .dsk-debug-controls input { flex: 1 1 auto; min-width: 0; }
.${DEBUGGER_CLASS} .dsk-debug-tabs {
  display: flex;
  gap: 0.3rem;
  align-items: center;
  padding: 0.3rem;
  border: 1px solid var(--dsk-border);
  border-radius: 0.6rem;
  background: var(--dsk-surface);
}
.${DEBUGGER_CLASS} input,
.${DEBUGGER_CLASS} button {
  border: 1px solid var(--dsk-border);
  border-radius: 0.5rem;
  background: var(--dsk-surface);
  color: var(--dsk-text);
  font: inherit;
  padding: 0.45rem 0.65rem;
  transition: border-color 0.12s ease, background 0.12s ease, color 0.12s ease;
}
.${DEBUGGER_CLASS} input { flex: 1 1 12rem; background: var(--dsk-surface-2); }
.${DEBUGGER_CLASS} input::placeholder { color: var(--dsk-faint); }
.${DEBUGGER_CLASS} input:focus-visible {
  outline: none;
  border-color: var(--dsk-border-strong);
}
.${DEBUGGER_CLASS} .dsk-debug-controls button {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  padding: 0;
  color: var(--dsk-muted);
  background: var(--dsk-surface-2);
}
.${DEBUGGER_CLASS} .dsk-debug-controls button:hover {
  color: var(--dsk-text);
  border-color: var(--dsk-border-strong);
  background: #1f1f1f;
}
.${DEBUGGER_CLASS} .dsk-debug-controls button svg { display: block; }
.${DEBUGGER_CLASS} .dsk-debug-tabs button {
  flex: 1;
  cursor: pointer;
  font-weight: 600;
  border-color: transparent;
  background: transparent;
  color: var(--dsk-muted);
}
.${DEBUGGER_CLASS} .dsk-debug-tabs button:hover:not([aria-selected]:not([aria-selected="false"])) {
  color: var(--dsk-text);
}
.${DEBUGGER_CLASS} .dsk-debug-tabs button[aria-selected]:not([aria-selected="false"]) {
  background: var(--dsk-surface-2);
  color: #fff;
}
.${DEBUGGER_CLASS} .dsk-debug-controls button[aria-pressed]:not([aria-pressed="false"]) {
  border-color: var(--dsk-border-strong);
  background: var(--dsk-surface-2);
  color: var(--dsk-text);
}
.${DEBUGGER_CLASS} .dsk-debug-panel { display: grid; gap: 0.6rem; }
.${DEBUGGER_CLASS} h3 {
  margin: 0;
  color: var(--dsk-muted);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.${DEBUGGER_CLASS} pre {
  max-height: 18rem;
  overflow: auto;
  margin: 0;
  border: 1px solid var(--dsk-border);
  border-radius: 0.5rem;
  background: var(--dsk-surface-2);
  color: var(--dsk-text);
  padding: 0.75rem 0.85rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: 11px/1.6 var(--dsk-mono);
}
.${DEBUGGER_CLASS} .dsk-debug-events {
  display: grid;
  gap: 0.45rem;
}
.${DEBUGGER_CLASS} .dsk-debug-event {
  position: static;
  width: auto;
  max-height: none;
  overflow: hidden;
  border: 1px solid var(--dsk-border);
  border-radius: 0.5rem;
  background: var(--dsk-surface-2);
  box-shadow: none;
}
.${DEBUGGER_CLASS} .dsk-debug-event[open] { border-color: var(--dsk-border-strong); }
.${DEBUGGER_CLASS} .dsk-debug-event summary {
  flex-wrap: nowrap;
  min-width: 0;
  padding: 0.55rem 0.7rem;
  border: 0;
  font-weight: 500;
  gap: 0.6rem;
  font-family: var(--dsk-mono);
  font-size: 11px;
}
.${DEBUGGER_CLASS} .dsk-debug-event summary:hover { background: #1f1f1f; }
.${DEBUGGER_CLASS} .dsk-debug-event[open] summary { border-bottom: 1px solid var(--dsk-border); }
.${DEBUGGER_CLASS} .dsk-debug-event pre {
  max-height: 14rem;
  border: 0;
  border-radius: 0;
  background: var(--dsk-bg);
}
.${DEBUGGER_CLASS} .dsk-debug-divider {
  border-top: 1px solid var(--dsk-border);
}
.${DEBUGGER_CLASS} .dsk-debug-time {
  flex: 0 0 auto;
  color: var(--dsk-faint);
  font-variant-numeric: tabular-nums;
}
.${DEBUGGER_CLASS} .dsk-debug-source {
  flex: 1 1 auto;
  min-width: 0;
  margin-left: auto;
  overflow: hidden;
  color: var(--dsk-muted);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.${DEBUGGER_CLASS} .dsk-debug-empty {
  margin: 0;
  padding: 1.75rem 0.75rem;
  text-align: center;
  color: var(--dsk-faint);
}
.${DEBUGGER_CLASS} .dsk-debug-kind { flex: 0 0 auto; font-weight: 600; }
.${DEBUGGER_CLASS} .dsk-debug-kind[data-kind="signal"] { color: var(--dsk-add); }
.${DEBUGGER_CLASS} .dsk-debug-kind[data-kind="fetch"] { color: var(--dsk-blue); }
.${DEBUGGER_CLASS} .dsk-token-punct { color: var(--dsk-faint); }
.${DEBUGGER_CLASS} .dsk-token-key,
.${DEBUGGER_CLASS} .dsk-token-tag { color: var(--dsk-blue); font-weight: 600; }
.${DEBUGGER_CLASS} .dsk-token-attr { color: var(--dsk-blue); }
.${DEBUGGER_CLASS} .dsk-token-string,
.${DEBUGGER_CLASS} .dsk-token-literal { color: var(--dsk-add); }
.${DEBUGGER_CLASS} .dsk-debug-timeline { display: grid; gap: 0.7rem; }
.${DEBUGGER_CLASS} .dsk-slider { display: grid; gap: 0.6rem; padding: 0.35rem 0; }
.${DEBUGGER_CLASS} .dsk-slider-track {
  position: relative;
  height: 24px;
  display: flex;
  align-items: center;
  cursor: pointer;
  touch-action: none;
  border-radius: 999px;
  outline: none;
}
.${DEBUGGER_CLASS} .dsk-slider-track::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 6px;
  border-radius: 999px;
  background: var(--dsk-surface-2);
  border: 1px solid var(--dsk-border);
  transform: translateY(-50%);
}
.${DEBUGGER_CLASS} .dsk-slider-fill {
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(90deg, var(--dsk-blue), #9bb8ff);
  box-shadow: 0 0 10px -2px rgb(122 162 247 / 0.55);
  transform: translate(0, -50%) scaleX(0);
  transform-origin: left center;
  pointer-events: none;
  will-change: transform;
}
.${DEBUGGER_CLASS} .dsk-slider-thumb {
  position: absolute;
  top: 50%;
  left: 0;
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #fff;
  border: 2px solid var(--dsk-blue);
  box-shadow: 0 2px 6px rgb(0 0 0 / 55%);
  transform: translate(0, -50%);
  transition: box-shadow 0.18s ease, border-color 0.16s ease;
  will-change: transform;
  pointer-events: none;
}
.${DEBUGGER_CLASS} .dsk-slider-track:hover .dsk-slider-thumb {
  box-shadow: 0 0 0 5px rgb(122 162 247 / 0.18), 0 2px 8px rgb(0 0 0 / 65%);
}
.${DEBUGGER_CLASS} .dsk-slider-track:active .dsk-slider-thumb,
.${DEBUGGER_CLASS} .dsk-slider-track[data-pressed] .dsk-slider-thumb {
  box-shadow: 0 0 0 6px rgb(122 162 247 / 0.3), 0 2px 10px rgb(0 0 0 / 75%);
}
.${DEBUGGER_CLASS} .dsk-slider-track:focus-visible .dsk-slider-thumb {
  box-shadow: 0 0 0 4px rgb(122 162 247 / 0.35), 0 2px 8px rgb(0 0 0 / 65%);
}
.${DEBUGGER_CLASS} .dsk-slider[data-disabled] { opacity: 0.5; }
.${DEBUGGER_CLASS} .dsk-slider[data-disabled] .dsk-slider-track { cursor: default; }
.${DEBUGGER_CLASS} .dsk-slider[data-disabled] .dsk-slider-fill {
  background: var(--dsk-faint);
  box-shadow: none;
}
.${DEBUGGER_CLASS} .dsk-slider[data-disabled] .dsk-slider-thumb { border-color: var(--dsk-faint); }
.${DEBUGGER_CLASS} .dsk-debug-controls button.dsk-debug-live { color: var(--dsk-red); }
.${DEBUGGER_CLASS} .dsk-debug-controls button.dsk-debug-live:hover { color: var(--dsk-red); }
.${DEBUGGER_CLASS} .dsk-debug-timeline-status {
  margin: 0;
  font: 11px/1.5 var(--dsk-mono);
  font-variant-numeric: tabular-nums;
  color: var(--dsk-muted);
}
.${DEBUGGER_CLASS} ::-webkit-scrollbar { width: 9px; height: 9px; }
.${DEBUGGER_CLASS} ::-webkit-scrollbar-thumb {
  background: #262626;
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}
.${DEBUGGER_CLASS} ::-webkit-scrollbar-thumb:hover { background: #383838; background-clip: padding-box; }
.${DEBUGGER_CLASS} ::-webkit-scrollbar-track { background: transparent; }
`

function assertStateName(stateName: string): asserts stateName is DatastarDebuggerStateName {
  if (!localStateNamePattern.test(stateName)) {
    throw new TypeError(
      `Datastar debugger stateName must be one underscore-prefixed signal name, received ${JSON.stringify(
        stateName
      )}`
    )
  }
}

const maxEventsValue = (value: number | undefined): number =>
  value !== undefined && Number.isInteger(value) && value > 0 ? value : DEFAULT_MAX_EVENTS

const maxSnapshotsValue = (value: number | undefined): number =>
  value !== undefined && Number.isInteger(value) && value > 0 ? value : DEFAULT_MAX_SNAPSHOTS

const rootClassName = (props: DatastarDebuggerProps): string =>
  [DEBUGGER_CLASS, props.class, props.className].filter(Boolean).join(" ")

export const datastarDebuggerDefaults = (): DatastarDebuggerState => ({
  tab: "signals",
  search: "",
  paused: false,
  events: [],
  snapshots: [],
  travel: { index: -1, active: false, pending: false }
})

const initialSignals = (stateName: DatastarDebuggerStateName): string =>
  JSON.stringify({ [stateName]: datastarDebuggerDefaults() })

const signalRef = (stateName: DatastarDebuggerStateName): string => `$${stateName}`

const stringifySource = `
const toDebugJson = (value) => {
  try {
    const json = JSON.stringify(value, null, 2)
    return json === undefined ? String(value) : json
  } catch {
    return String(value)
  }
}
`

const htmlEscapeSource = `
const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;")
`

const syntaxHighlightSource = `
const highlightJson = (value) => toDebugJson(value).replace(
  /("(?:\\\\.|[^"\\\\])*")(\\s*:)?|-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?|\\btrue\\b|\\bfalse\\b|\\bnull\\b/g,
  (token, stringToken, keySuffix = "") => {
    if (stringToken) {
      const className = keySuffix ? "dsk-token-key" : "dsk-token-string"
      return '<span class="' + className + '">' + escapeHtml(stringToken) + '</span>' + escapeHtml(keySuffix)
    }
    return '<span class="dsk-token-literal">' + escapeHtml(token) + '</span>'
  }
)
const highlightAttrs = (text) => {
  let output = ""
  let lastIndex = 0
  text.replace(/([^\\s=]+)=("[^"]*"|'[^']*')/g, (match, name, value, index) => {
    output += escapeHtml(text.slice(lastIndex, index))
    output += '<span class="dsk-token-attr">' + escapeHtml(name) + '</span>'
    output += '<span class="dsk-token-punct">=</span>'
    output += '<span class="dsk-token-string">' + escapeHtml(value) + '</span>'
    lastIndex = index + match.length
    return match
  })
  return output + escapeHtml(text.slice(lastIndex))
}
const highlightHtmlLine = (line) => {
  const blockStart = line.match(/^(\\s*)<([A-Za-z][A-Za-z0-9:-]*)$/)
  if (blockStart) {
    return escapeHtml(blockStart[1]) + '<span class="dsk-token-punct">&lt;</span><span class="dsk-token-tag">' + escapeHtml(blockStart[2]) + '</span>'
  }
  const blockEnd = line.match(/^(\\s*)>$/)
  if (blockEnd) return escapeHtml(blockEnd[1]) + '<span class="dsk-token-punct">&gt;</span>'

  const attrLine = line.match(/^(\\s*)([^\\s=]+)=("[^"]*"|'[^']*')$/)
  if (attrLine) {
    return escapeHtml(attrLine[1])
      + '<span class="dsk-token-attr">' + escapeHtml(attrLine[2]) + '</span>'
      + '<span class="dsk-token-punct">=</span>'
      + '<span class="dsk-token-string">' + escapeHtml(attrLine[3]) + '</span>'
  }

  const inlineElement = line.match(/^(\\s*)<([A-Za-z][A-Za-z0-9:-]*)([^>]*)>([^<]*)<\\/\\2>$/)
  if (inlineElement) {
    return escapeHtml(inlineElement[1])
      + '<span class="dsk-token-punct">&lt;</span>'
      + '<span class="dsk-token-tag">' + escapeHtml(inlineElement[2]) + '</span>'
      + highlightAttrs(inlineElement[3])
      + '<span class="dsk-token-punct">&gt;</span>'
      + escapeHtml(inlineElement[4])
      + '<span class="dsk-token-punct">&lt;/</span>'
      + '<span class="dsk-token-tag">' + escapeHtml(inlineElement[2]) + '</span>'
      + '<span class="dsk-token-punct">&gt;</span>'
  }

  const tagLine = line.match(/^(\\s*)<(\\/?)([A-Za-z][A-Za-z0-9:-]*)([^>]*)>$/)
  if (!tagLine) return escapeHtml(line)

  return escapeHtml(tagLine[1])
    + '<span class="dsk-token-punct">&lt;' + escapeHtml(tagLine[2]) + '</span>'
    + '<span class="dsk-token-tag">' + escapeHtml(tagLine[3]) + '</span>'
    + highlightAttrs(tagLine[4])
    + '<span class="dsk-token-punct">&gt;</span>'
}
const highlightHtml = (html) => html.split("\\n").map(highlightHtmlLine).join("\\n")
`

const htmlFormatterSource = `
const formatHtml = (html) => {
  try {
    const voidTags = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"])
    const template = document.createElement("template")
    template.innerHTML = html
    const lines = []
    const attrText = (attr) => {
      const quote = attr.value.includes('"') && !attr.value.includes("'") ? "'" : '"'
      const escaped = quote === '"'
        ? attr.value.replaceAll('"', "&quot;")
        : attr.value.replaceAll("'", "&#39;")
      return attr.name + "=" + quote + escaped + quote
    }
    const openLines = (element, indent) => {
      const tag = element.tagName.toLowerCase()
      const attrs = Array.from(element.attributes).map(attrText)
      const singleLine = "<" + tag + (attrs.length ? " " + attrs.join(" ") : "") + ">"
      if (singleLine.length <= 80) return [indent + singleLine]
      return [indent + "<" + tag, ...attrs.map((attr) => indent + "  " + attr), indent + ">"]
    }
    const walk = (node, depth = 0) => {
      const indent = "  ".repeat(depth)
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim()
        if (text) lines.push(indent + text)
        return
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return

      const tag = node.tagName.toLowerCase()
      const children = Array.from(node.childNodes)
      const opening = openLines(node, indent)
      if (voidTags.has(tag)) {
        lines.push(...opening)
        return
      }
      if (opening.length === 1 && children.length === 1 && children[0].nodeType === Node.TEXT_NODE) {
        const text = children[0].textContent.trim()
        const line = opening[0] + text + "</" + tag + ">"
        if (line.length <= 120) {
          lines.push(line)
          return
        }
      }

      lines.push(...opening)
      for (const child of children) walk(child, depth + 1)
      lines.push(indent + "</" + tag + ">")
    }

    for (const child of Array.from(template.content.childNodes)) walk(child)
    return lines.join("\\n") || html
  } catch {
    return html
  }
}
`

const matcherSource = (stateName: DatastarDebuggerStateName): string => `
const search = String(${signalRef(stateName)}.search || "").trim()
const createMatcher = () => {
  if (!search) return () => true

  const regex = search.match(/^\\/(.*)\\/([a-z]*)$/i)
  if (regex) {
    try {
      const flags = regex[2].replace(/[gy]/g, "")
      const matcher = new RegExp(regex[1], flags)
      return (value) => matcher.test(String(value))
    } catch {
      return () => false
    }
  }

  const lowered = search.toLowerCase()
  return (value) => String(value).toLowerCase().includes(lowered)
}
const matchesSearch = createMatcher()
`

const debugValueSource = `
const toElementLabel = (value) => {
  if (!value) return "document"
  return value.id ? "#" + value.id : "<" + String(value.tagName || "element").toLowerCase() + ">"
}
const toDebugValue = (value, seen = new WeakSet()) => {
  if (typeof value === "string") {
    return value.length > ${MAX_DEBUG_STRING_LENGTH}
      ? value.slice(0, ${MAX_DEBUG_STRING_LENGTH}) + "… truncated"
      : value
  }
  if (typeof value === "function") return "[Function]"
  if (typeof value === "bigint") return String(value) + "n"
  if (typeof Element !== "undefined" && value instanceof Element) return toElementLabel(value)
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[Circular]"
    seen.add(value)
    if (Array.isArray(value)) return value.map((item) => toDebugValue(item, seen))

    const output = {}
    for (const [key, item] of Object.entries(value)) output[key] = toDebugValue(item, seen)
    return output
  }
  return value
}
`

const patchTargetSource = `
const patchTargetLabel = (type, argsRaw) => {
  if (type !== "datastar-patch-elements") return undefined

  const selector = typeof argsRaw.selector === "string" ? argsRaw.selector.trim() : ""
  if (selector) return selector

  const elements = typeof argsRaw.elements === "string" ? argsRaw.elements : ""
  if (!elements) return undefined

  const template = document.createElement("template")
  template.innerHTML = elements
  const ids = Array.from(template.content.children)
    .map((element) => element.id ? "#" + element.id : "")
    .filter(Boolean)

  return ids.length > 0 ? ids.join(", ") : undefined
}
`

const signalSnapshotSource = (stateName: DatastarDebuggerStateName): string => `
const signalSnapshot = () => {
  const snapshot = {}
  for (const [key, value] of Object.entries($)) {
    if (key !== ${JSON.stringify(stateName)}) snapshot[key] = toDebugValue(value)
  }
  return snapshot
}
`

const rememberEventSource = (maxEvents: number): string => `
const rememberEvent = (event) => {
  debug.events.unshift(event)
  debug.events.length = Math.min(debug.events.length, ${maxEvents})
}
`

const rawSignalSnapshotSource = (stateName: DatastarDebuggerStateName): string => `
const rawSignalSnapshot = () => {
  const snapshot = {}
  for (const key of Object.keys($)) {
    if (key === ${JSON.stringify(stateName)}) continue
    try {
      snapshot[key] = JSON.parse(JSON.stringify($[key]))
    } catch {
      // Skip signals that cannot round-trip through JSON.
    }
  }
  return snapshot
}
`

const captureSnapshotSource = (id: string): string => `
const captureSnapshot = (label) => {
  const bodyClone = document.body.cloneNode(true)
  const debuggerClone = bodyClone.querySelector("#" + CSS.escape(${JSON.stringify(id)}))
  if (debuggerClone) debuggerClone.remove()
  return {
    at: new Date().toLocaleTimeString(),
    label,
    html: bodyClone.innerHTML,
    signals: rawSignalSnapshot()
  }
}
`

const rememberSnapshotSource = (maxSnapshots: number): string => `
const rememberSnapshot = (label) => {
  const travel = debug.travel
  if (travel.pending) return
  travel.pending = true
  setTimeout(() => {
    travel.pending = false
    if (debug.paused || travel.active) return
    debug.snapshots.push(captureSnapshot(label))
    const excess = debug.snapshots.length - ${maxSnapshots}
    if (excess > 0) debug.snapshots.splice(0, excess)
  }, ${SNAPSHOT_SETTLE_MS})
}
`

const applySnapshotSource = (id: string, stateName: DatastarDebuggerStateName): string => `
const applySnapshot = (snapshot, afterRestore) => {
  const root = document.getElementById(${JSON.stringify(id)})
  if (root && root.parentElement !== document.body) document.body.appendChild(root)
  for (const child of Array.from(document.body.children)) {
    if (child !== root) child.remove()
  }
  if (root) root.insertAdjacentHTML("beforebegin", snapshot.html)
  else document.body.insertAdjacentHTML("afterbegin", snapshot.html)
  setTimeout(() => {
    for (const key of Object.keys($)) {
      if (key !== ${JSON.stringify(stateName)} && !Object.hasOwn(snapshot.signals, key)) {
        try {
          delete $[key]
        } catch {
          // Ignore signals the runtime refuses to delete.
        }
      }
    }

    for (const [key, value] of Object.entries(snapshot.signals)) {
      try {
        $[key] = value
      } catch {
        // Ignore signals the runtime refuses to patch.
      }
    }

    if (afterRestore) setTimeout(afterRestore)
  })
}
`

interface SnapshotExpressionOptions {
  readonly stateName: DatastarDebuggerStateName
  readonly maxSnapshots: number
  readonly id: string
}

const signalPatchExpression = (
  stateName: DatastarDebuggerStateName,
  maxEvents: number,
  snapshot: SnapshotExpressionOptions
): string => `
(() => {
  const debug = ${signalRef(stateName)}
  if (debug.paused || debug.travel.active) return

  ${debugValueSource}
  ${rememberEventSource(maxEvents)}
  ${rawSignalSnapshotSource(snapshot.stateName)}
  ${captureSnapshotSource(snapshot.id)}
  ${rememberSnapshotSource(snapshot.maxSnapshots)}

  rememberEvent({
    at: new Date().toLocaleTimeString(),
    kind: "signal",
    patch: toDebugValue(patch)
  })
  rememberSnapshot("signal patch")
})()
`

const fetchExpression = (
  stateName: DatastarDebuggerStateName,
  maxEvents: number,
  snapshot: SnapshotExpressionOptions
): string => `
(() => {
  const debug = ${signalRef(stateName)}
  if (debug.paused || debug.travel.active) return

  ${debugValueSource}
  ${patchTargetSource}
  ${signalSnapshotSource(stateName)}
  ${rememberEventSource(maxEvents)}
  ${rawSignalSnapshotSource(snapshot.stateName)}
  ${captureSnapshotSource(snapshot.id)}
  ${rememberSnapshotSource(snapshot.maxSnapshots)}

  const detail = evt.detail || {}
  const type = detail.type || evt.type
  const argsRaw = detail.argsRaw || {}
  const target = patchTargetLabel(type, argsRaw)
  const entry = {
    at: new Date().toLocaleTimeString(),
    kind: "fetch",
    type,
    element: toElementLabel(detail.el),
    ...(target ? { target } : {}),
    argsRaw: toDebugValue(argsRaw)
  }

  if (entry.type === "started") entry.signals = signalSnapshot()
  rememberEvent(entry)
  if (type === "datastar-patch-elements") rememberSnapshot(type)
})()
`

const initialSnapshotExpression = (snapshot: SnapshotExpressionOptions): string => `
(() => {
  const debug = ${signalRef(snapshot.stateName)}
  if (debug.paused || debug.travel.active) return

  ${rawSignalSnapshotSource(snapshot.stateName)}
  ${captureSnapshotSource(snapshot.id)}
  ${rememberSnapshotSource(snapshot.maxSnapshots)}

  rememberSnapshot("initial")
})()
`

const timelineSliderInitExpression = (snapshot: SnapshotExpressionOptions): string => `
(() => {
  const debug = ${signalRef(snapshot.stateName)}
  if (el.__dskSlider) return
  el.__dskSlider = true

  ${applySnapshotSource(snapshot.id, snapshot.stateName)}

  const track = el.querySelector("[data-dsk-track]")
  const thumb = el.querySelector("[data-dsk-thumb]")
  const fill = el.querySelector("[data-dsk-fill]")
  const status = el.querySelector("[data-dsk-status]")
  const HALF = 8

  let trackWidth = track.getBoundingClientRect().width
  let pressed = false
  let dragging = false
  let targetPct = 1
  let viewPct = 1

  const readMax = () => Math.max(debug.snapshots.length - 1, 0)
  const clampPct = (p) => (p < 0 ? 0 : p > 1 ? 1 : p)
  const pctToIndex = (p) => {
    const max = readMax()
    return max === 0 ? 0 : Math.round(clampPct(p) * max)
  }
  const syncFromState = () => {
    const max = readMax()
    targetPct = max === 0 ? 0 : (debug.travel.active ? debug.travel.index : max) / max
  }
  syncFromState()
  viewPct = targetPct

  const statusText = (p, scrubbing) => {
    const snapshots = debug.snapshots
    const n = snapshots.length
    if (n === 0) return "0 snapshots"
    const live = !debug.travel.active && !scrubbing
    if (live) return n + (n === 1 ? " snapshot" : " snapshots") + " \u00b7 live"
    const idx = scrubbing ? pctToIndex(p) : (debug.travel.active ? debug.travel.index : n - 1)
    const s = snapshots[idx]
    if (!s) return "no snapshot"
    return (idx + 1) + "/" + n + " \u00b7 " + s.at + " \u00b7 " + s.label + (scrubbing ? " \u00b7 scrubbing" : "")
  }

  const applyIndex = (index) => {
    const max = readMax()
    const snapshots = debug.snapshots
    if (snapshots.length === 0) return
    const travel = debug.travel
    if (!travel.active && index === max) return
    if (travel.active && travel.index === index) return
    travel.index = index
    if (index < max) {
      travel.active = true
      applySnapshot(snapshots[index])
    } else {
      applySnapshot(snapshots[index], () => { travel.active = false })
    }
  }

  const pointerPct = (event) => {
    const rect = track.getBoundingClientRect()
    trackWidth = rect.width
    const x = (event.clientX != null ? event.clientX : 0) - rect.left
    return clampPct(x / rect.width)
  }

  const onDown = (event) => {
    if (debug.snapshots.length < 2) return
    pressed = true
    dragging = false
    targetPct = pointerPct(event)
    track.setAttribute("data-pressed", "")
    try { track.setPointerCapture(event.pointerId) } catch {}
    event.preventDefault()
  }
  const onMove = (event) => {
    if (!pressed) return
    const p = pointerPct(event)
    if (!dragging && Math.abs(p - targetPct) > 0.006) dragging = true
    targetPct = p
    if (dragging) {
      viewPct = targetPct
      applyIndex(pctToIndex(targetPct))
    }
  }
  const onUp = () => {
    if (!pressed) return
    pressed = false
    track.removeAttribute("data-pressed")
    applyIndex(pctToIndex(targetPct))
    dragging = false
  }
  const onKeyDown = (event) => {
    if (debug.snapshots.length < 2) return
    const max = readMax()
    let idx = debug.travel.active ? debug.travel.index : max
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") idx -= 1
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") idx += 1
    else if (event.key === "Home") idx = 0
    else if (event.key === "End") idx = max
    else return
    event.preventDefault()
    idx = Math.min(Math.max(idx, 0), max)
    targetPct = max === 0 ? 0 : idx / max
    applyIndex(idx)
  }

  track.addEventListener("pointerdown", onDown)
  track.addEventListener("keydown", onKeyDown)
  window.addEventListener("pointermove", onMove)
  window.addEventListener("pointerup", onUp)
  window.addEventListener("pointercancel", onUp)
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(() => { trackWidth = track.getBoundingClientRect().width }).observe(track)
  }

  const render = () => {
    if (!pressed) syncFromState()
    if (dragging) {
      viewPct = targetPct
    } else {
      const d = targetPct - viewPct
      viewPct += d * 0.22
      if (Math.abs(d) < 0.0004) viewPct = targetPct
    }

    let x = viewPct * trackWidth - HALF
    if (x < 0) x = 0
    const maxX = Math.max(trackWidth - HALF * 2, 0)
    if (x > maxX) x = maxX
    thumb.style.transform = "translate(" + x + "px, -50%)"
    fill.style.transform = "translate(0, -50%) scaleX(" + (trackWidth > 0 ? (x + HALF) / trackWidth : 0) + ")"

    const disabled = debug.snapshots.length < 2
    if (disabled) el.setAttribute("data-disabled", "")
    else el.removeAttribute("data-disabled")
    track.setAttribute("aria-valuemax", String(debug.snapshots.length))
    track.setAttribute("aria-valuenow", String(pctToIndex(viewPct) + 1))
    if (status) status.textContent = statusText(viewPct, pressed || dragging)

    requestAnimationFrame(render)
  }
  requestAnimationFrame(render)
})()
`

const goLiveExpression = (snapshot: SnapshotExpressionOptions): string => `
(() => {
  const debug = ${signalRef(snapshot.stateName)}
  const travel = debug.travel
  const snapshots = debug.snapshots

  ${applySnapshotSource(snapshot.id, snapshot.stateName)}

  travel.index = snapshots.length - 1
  if (!travel.active || snapshots.length === 0) {
    travel.active = false
    return
  }

  applySnapshot(snapshots[snapshots.length - 1], () => {
    travel.active = false
  })
})()
`

const signalCountExpression = (stateName: DatastarDebuggerStateName): string =>
  `Object.keys($).filter((key) => key !== ${JSON.stringify(stateName)}).length + " signals"`

const signalsHtmlExpression = (stateName: DatastarDebuggerStateName): string => `
(() => {
  ${debugValueSource}
  ${signalSnapshotSource(stateName)}
  ${stringifySource}
  ${htmlEscapeSource}
  ${syntaxHighlightSource}
  ${matcherSource(stateName)}

  const snapshot = signalSnapshot()
  if (!search) {
    el.innerHTML = highlightJson(snapshot)
    return
  }

  const noMatch = Symbol("noMatch")
  const prunedValue = (value, path = "") => {
    if (matchesSearch(path)) return value
    if (value && typeof value === "object") {
      const output = Array.isArray(value) ? [] : {}
      let hasMatch = false

      for (const [key, item] of Object.entries(value)) {
        const childPath = path ? path + "." + key : key
        const child = prunedValue(item, childPath)
        if (child !== noMatch) {
          if (Array.isArray(output)) output.push(child)
          else output[key] = child
          hasMatch = true
        }
      }

      return hasMatch ? output : noMatch
    }

    return matchesSearch(path + " " + toDebugJson(value)) ? value : noMatch
  }

  const pruned = prunedValue(snapshot)
  el.innerHTML = pruned === noMatch ? "No signals match search." : highlightJson(pruned)
})()
`
const eventsHtmlExpression = (stateName: DatastarDebuggerStateName): string => `
(() => {
  ${stringifySource}
  ${matcherSource(stateName)}
  ${htmlEscapeSource}
  ${syntaxHighlightSource}
  ${htmlFormatterSource}

  const events = Array.from(${signalRef(stateName)}.events || [])
  const parseJsonObjectString = (value) => {
    if (typeof value !== "string") return value
    const trimmed = value.trim()
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value
    try {
      return JSON.parse(trimmed)
    } catch {
      return value
    }
  }
  const eventForDisplay = (event) => {
    if (event.kind !== "fetch") return event
    return {
      ...event,
      argsRaw: {
        ...event.argsRaw,
        signals: parseJsonObjectString(event.argsRaw.signals)
      }
    }
  }
  const eventLabel = (event) => event.kind === "signal" ? "signal patch" : event.type
  const eventSource = (event) => event.kind !== "fetch" ? "" : event.target || event.element
  const eventText = (event) => {
    const displayEvent = eventForDisplay(event)
    if (displayEvent.kind === "signal") return [displayEvent.at, eventLabel(displayEvent), toDebugJson(displayEvent.patch)].join(" ")
    return [displayEvent.at, displayEvent.type, displayEvent.element, displayEvent.target || "", toDebugJson(displayEvent.argsRaw), toDebugJson(displayEvent.signals || {})].join(" ")
  }
  const eventDetails = (event) => {
    const displayEvent = eventForDisplay(event)
    const elements = event.kind === "fetch" && event.type === "datastar-patch-elements" && typeof event.argsRaw.elements === "string"
      ? event.argsRaw.elements
      : undefined
    if (!elements) return '<pre>' + highlightJson(displayEvent) + '</pre>'

    const eventWithoutElements = {
      ...displayEvent,
      argsRaw: { ...displayEvent.argsRaw, elements: "[formatted below]" }
    }
    return '<pre>' + highlightJson(eventWithoutElements) + '</pre>'
      + '<div class="dsk-debug-divider"></div>'
      + '<pre>' + highlightHtml(formatHtml(elements)) + '</pre>'
  }
  const renderEvent = (event) => [
    '<details class="dsk-debug-event">',
      '<summary>',
        '<span class="dsk-debug-time">', escapeHtml(event.at), '</span>',
        '<span class="dsk-debug-kind" data-kind="', escapeHtml(event.kind), '">', escapeHtml(eventLabel(event)), '</span>',
        event.kind === "fetch" ? '<span class="dsk-debug-source">' + escapeHtml(eventSource(event)) + '</span>' : '',
      '</summary>',
      eventDetails(event),
    '</details>'
  ].join("")

  const visibleEvents = search ? events.filter((event) => matchesSearch(eventText(event))) : events
  if (visibleEvents.length === 0) {
    const message = events.length === 0 ? "No debugger events yet." : "No events match search."
    el.innerHTML = '<p class="dsk-debug-empty">' + message + '</p>'
    return
  }

  el.innerHTML = visibleEvents.map(renderEvent).join("")
})()
`

const tabButton = ({
  stateName,
  tab,
  label
}: {
  readonly stateName: DatastarDebuggerStateName
  readonly tab: DatastarDebuggerTab
  readonly label: string
}): HtmlChild =>
  h(
    "button",
    {
      type: "button",
      role: "tab",
      "data-on:click": `${signalRef(stateName)}.tab = ${JSON.stringify(tab)}`,
      "data-attr:aria-selected": `${signalRef(stateName)}.tab === ${JSON.stringify(tab)}`
    },
    label
  )

const pill = (props: Record<string, string>, fallback: string): HtmlChild =>
  h("span", { class: "dsk-debug-pill", ...props }, fallback)

const icon = (props: Record<string, string>, ...paths: readonly HtmlChild[]): HtmlChild =>
  h(
    "svg",
    {
      width: "15",
      height: "15",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      "stroke-width": "2",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
      "aria-hidden": "true",
      ...props
    },
    ...paths
  )

const pauseIcon = (stateName: DatastarDebuggerStateName): HtmlChild => [
  h(
    "span",
    { "data-show": `!${signalRef(stateName)}.paused`, style: "display:flex" },
    icon(
      {},
      h("rect", { x: "6", y: "5", width: "4", height: "14", rx: "1" }),
      h("rect", { x: "14", y: "5", width: "4", height: "14", rx: "1" })
    )
  ),
  h(
    "span",
    { "data-show": `${signalRef(stateName)}.paused`, style: "display:flex" },
    icon({}, h("path", { d: "M7 5l12 7-12 7z" }))
  )
]

const trashIcon = (): HtmlChild =>
  icon(
    {},
    h("path", { d: "M3 6h18" }),
    h("path", { d: "M8 6V4h8v2" }),
    h("path", { d: "M6 6l1 14h10l1-14" })
  )

const liveIcon = (): HtmlChild =>
  icon(
    {},
    h("circle", { cx: "12", cy: "12", r: "4.2", fill: "currentColor", stroke: "none" }),
    h("circle", { cx: "12", cy: "12", r: "8.5" })
  )

const tabPanel = ({
  stateName,
  tab,
  title,
  children
}: {
  readonly stateName: DatastarDebuggerStateName
  readonly tab: DatastarDebuggerTab
  readonly title: string
  readonly children: HtmlChild
}): HtmlChild =>
  h(
    "section",
    {
      class: "dsk-debug-panel",
      role: "tabpanel",
      "data-show": `${signalRef(stateName)}.tab === ${JSON.stringify(tab)}`
    },
    h("h3", {}, title),
    children
  )

/**
 * Server-rendered Datastar debugger panel.
 *
 * Add this component to development pages after loading the Datastar runtime. It uses ordinary
 * Datastar signals and attributes, so no custom element registration or app-specific client bundle
 * is required.
 */
export const DatastarDebugger = (props: DatastarDebuggerProps = {}): HtmlChild => {
  const stateName = props.stateName ?? DATASTAR_DEBUGGER_STATE_NAME
  assertStateName(stateName)
  const maxEvents = maxEventsValue(props.maxEvents)
  const snapshot: SnapshotExpressionOptions = {
    stateName,
    maxSnapshots: maxSnapshotsValue(props.maxSnapshots),
    id: props.id ?? DEBUGGER_ID
  }

  return h(
    "section",
    {
      id: snapshot.id,
      class: rootClassName(props),
      style: props.style,
      "data-signals__ifmissing": initialSignals(stateName),
      "data-on-signal-patch-filter": `{exclude: /^${stateName}(\\.|$)/}`,
      "data-on-signal-patch": signalPatchExpression(stateName, maxEvents, snapshot),
      "data-on:datastar-fetch": fetchExpression(stateName, maxEvents, snapshot),
      "data-init": initialSnapshotExpression(snapshot)
    },
    h("style", {}, debuggerStyles),
    h(
      "details",
      { open: props.open ?? true },
      h(
        "summary",
        {},
        h("span", { class: "dsk-debug-label" }, "Debug"),
        pill({ "data-text": signalCountExpression(stateName) }, "0 signals"),
        pill({ "data-text": `${signalRef(stateName)}.events.length + " events"` }, "0 events"),
        pill(
          {
            "data-kind": "warn",
            "data-show": `${signalRef(stateName)}.paused`
          },
          "paused"
        ),
        pill(
          {
            "data-kind": "warn",
            "data-show": `${signalRef(stateName)}.travel.active`
          },
          "time travel"
        )
      ),
      h(
        "div",
        { class: "dsk-debug-body" },
        h(
          "div",
          { class: "dsk-debug-tabs", role: "tablist" },
          tabButton({ stateName, tab: "signals", label: "Signals" }),
          tabButton({ stateName, tab: "events", label: "Events" }),
          tabButton({ stateName, tab: "timeline", label: "Timeline" })
        ),
        h(
          "div",
          { class: "dsk-debug-controls" },
          h("input", {
            type: "search",
            placeholder: "Search or /regex/i",
            "aria-label": "Search debugger",
            "data-attr:disabled": `${signalRef(stateName)}.tab === "timeline"`,
            "data-bind": `${stateName}.search`
          }),
          h(
            "button",
            {
              type: "button",
              "aria-label": "Pause debugger",
              "data-attr:aria-label": `${signalRef(stateName)}.paused ? "Resume debugger" : "Pause debugger"`,
              "data-attr:title": `${signalRef(stateName)}.paused ? "Resume" : "Pause"`,
              "data-on:click": `${signalRef(stateName)}.paused = !${signalRef(stateName)}.paused`,
              "data-attr:aria-pressed": `${signalRef(stateName)}.paused`
            },
            pauseIcon(stateName)
          ),
          h(
            "button",
            {
              type: "button",
              "aria-label": "Clear events",
              title: "Clear events",
              "data-show": `${signalRef(stateName)}.tab === "events"`,
              "data-on:click": `${signalRef(stateName)}.events = []`
            },
            trashIcon()
          ),
          h(
            "button",
            {
              type: "button",
              "aria-label": "Clear snapshots",
              title: "Clear snapshots",
              "data-show": `${signalRef(stateName)}.tab === "timeline" && !${signalRef(stateName)}.travel.active`,
              "data-on:click": `(() => { const debug = ${signalRef(stateName)}; debug.snapshots = []; debug.travel.index = -1; debug.travel.active = false; debug.travel.pending = false })()`
            },
            trashIcon()
          ),
          h(
            "button",
            {
              type: "button",
              class: "dsk-debug-live",
              "aria-label": "Return to live",
              title: "Return to live",
              "data-show": `${signalRef(stateName)}.tab === "timeline" && ${signalRef(stateName)}.travel.active`,
              "data-on:click": goLiveExpression(snapshot)
            },
            liveIcon()
          )
        ),
        tabPanel({
          stateName,
          tab: "signals",
          title: "Signals",
          children: h("pre", { "data-effect": signalsHtmlExpression(stateName) }, "{}")
        }),
        tabPanel({
          stateName,
          tab: "events",
          title: "Events",
          children: h("div", {
            class: "dsk-debug-events",
            "data-effect": eventsHtmlExpression(stateName)
          })
        }),
        tabPanel({
          stateName,
          tab: "timeline",
          title: "Timeline",
          children: h(
            "div",
            { class: "dsk-debug-timeline" },
            h(
              "div",
              {
                class: "dsk-slider",
                "data-init": timelineSliderInitExpression(snapshot)
              },
              h(
                "div",
                {
                  class: "dsk-slider-track",
                  "data-dsk-track": "",
                  tabindex: "0",
                  role: "slider",
                  "aria-label": "Timeline position",
                  "aria-valuemin": "0",
                  "aria-valuemax": "0",
                  "aria-valuenow": "0"
                },
                h("div", { class: "dsk-slider-fill", "data-dsk-fill": "" }),
                h("div", { class: "dsk-slider-thumb", "data-dsk-thumb": "" })
              ),
              h(
                "p",
                { class: "dsk-debug-timeline-status", "data-dsk-status": "" },
                "0 snapshots"
              )
            )
          )
        })
      )
    )
  )
}
