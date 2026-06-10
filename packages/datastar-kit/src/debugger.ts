import { h, type HtmlChild } from "./html.js"

export const DATASTAR_DEBUGGER_STATE_NAME = "_datastarKitDebugger" as const

export type DatastarDebuggerStateName = `_${string}`
export type DatastarDebuggerTab = "signals" | "events"

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
  readonly argsRaw: Readonly<Record<string, unknown>>
  readonly signals?: Readonly<Record<string, unknown>>
}

export type DatastarDebuggerEventEntry =
  | DatastarDebuggerSignalPatchEntry
  | DatastarDebuggerFetchEntry

export interface DatastarDebuggerState {
  readonly tab: DatastarDebuggerTab
  readonly search: string
  readonly paused: boolean
  readonly events: readonly DatastarDebuggerEventEntry[]
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
  /** Visible title in the summary row. @defaultValue `"Datastar debugger"` */
  readonly title?: string
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
const MAX_DEBUG_STRING_LENGTH = 2_000

const localStateNamePattern = /^_[A-Za-z][A-Za-z0-9_]*$/

const debuggerStyles = `
.${DEBUGGER_CLASS} {
  display: contents;
  color-scheme: dark;
  font: 12px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.${DEBUGGER_CLASS} * { box-sizing: border-box; }
.${DEBUGGER_CLASS} details {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 2147483647;
  width: min(92vw, 34rem);
  max-height: min(72vh, 36rem);
  overflow: auto;
  border: 1px solid #334155;
  border-radius: 0.75rem;
  background: #020617;
  color: #e2e8f0;
  box-shadow: 0 20px 60px rgb(0 0 0 / 45%);
}
.${DEBUGGER_CLASS} details:not([open]) { width: auto; }
.${DEBUGGER_CLASS} summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  cursor: pointer;
  padding: 0.65rem 0.75rem;
  list-style: none;
  font-weight: 700;
}
.${DEBUGGER_CLASS} summary::-webkit-details-marker { display: none; }
.${DEBUGGER_CLASS} .dsk-debug-title { margin-right: auto; }
.${DEBUGGER_CLASS} .dsk-debug-pill {
  border: 1px solid #334155;
  border-radius: 999px;
  background: #0f172a;
  color: #94a3b8;
  padding: 0.1rem 0.45rem;
  font-size: 11px;
  font-weight: 650;
}
.${DEBUGGER_CLASS} .dsk-debug-pill[data-kind="warn"] { color: #fbbf24; }
.${DEBUGGER_CLASS} .dsk-debug-body {
  display: grid;
  gap: 0.7rem;
  padding: 0.75rem;
  border-top: 1px solid #334155;
}
.${DEBUGGER_CLASS} .dsk-debug-controls,
.${DEBUGGER_CLASS} .dsk-debug-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}
.${DEBUGGER_CLASS} input,
.${DEBUGGER_CLASS} button {
  border: 1px solid #334155;
  border-radius: 0.45rem;
  background: #0f172a;
  color: #e2e8f0;
  font: inherit;
  padding: 0.35rem 0.55rem;
}
.${DEBUGGER_CLASS} input { flex: 1 1 12rem; }
.${DEBUGGER_CLASS} button { cursor: pointer; }
.${DEBUGGER_CLASS} button:hover,
.${DEBUGGER_CLASS} button[aria-selected="true"] { border-color: #38bdf8; }
.${DEBUGGER_CLASS} button[aria-pressed="true"] {
  border-color: #fbbf24;
  color: #fbbf24;
}
.${DEBUGGER_CLASS} .dsk-debug-panel { display: grid; gap: 0.45rem; }
.${DEBUGGER_CLASS} h3 {
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.${DEBUGGER_CLASS} pre {
  max-height: 18rem;
  overflow: auto;
  margin: 0;
  border: 1px solid #1e293b;
  border-radius: 0.55rem;
  background: #0f172a;
  color: #e2e8f0;
  padding: 0.6rem;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: 11px/1.45 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
.${DEBUGGER_CLASS} .dsk-debug-events {
  display: grid;
  gap: 0.4rem;
}
.${DEBUGGER_CLASS} .dsk-debug-event {
  position: static;
  width: auto;
  max-height: none;
  overflow: visible;
  border: 1px solid #1e293b;
  border-radius: 0.55rem;
  background: #0f172a;
  box-shadow: none;
}
.${DEBUGGER_CLASS} .dsk-debug-event summary {
  padding: 0.5rem 0.6rem;
  border: 0;
  font-weight: 500;
}
.${DEBUGGER_CLASS} .dsk-debug-event pre {
  max-height: 14rem;
  border: 0;
  border-top: 1px solid #1e293b;
  border-radius: 0;
}
.${DEBUGGER_CLASS} .dsk-debug-time,
.${DEBUGGER_CLASS} .dsk-debug-source,
.${DEBUGGER_CLASS} .dsk-debug-empty { color: #94a3b8; }
.${DEBUGGER_CLASS} .dsk-debug-kind { color: #38bdf8; }
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
  Number.isInteger(value) && value !== undefined && value > 0 ? value : DEFAULT_MAX_EVENTS

const rootClassName = (props: DatastarDebuggerProps): string =>
  [DEBUGGER_CLASS, props.class, props.className].filter(Boolean).join(" ")

export const datastarDebuggerDefaults = (): DatastarDebuggerState => ({
  tab: "signals",
  search: "",
  paused: false,
  events: []
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

const signalPatchExpression = (stateName: DatastarDebuggerStateName, maxEvents: number): string => `
(() => {
  const debug = ${signalRef(stateName)}
  if (debug.paused) return

  ${debugValueSource}
  ${rememberEventSource(maxEvents)}

  rememberEvent({
    at: new Date().toLocaleTimeString(),
    kind: "signal",
    patch: toDebugValue(patch)
  })
})()
`

const fetchExpression = (stateName: DatastarDebuggerStateName, maxEvents: number): string => `
(() => {
  const debug = ${signalRef(stateName)}
  if (debug.paused) return

  ${debugValueSource}
  ${signalSnapshotSource(stateName)}
  ${rememberEventSource(maxEvents)}

  const detail = evt.detail || {}
  const entry = {
    at: new Date().toLocaleTimeString(),
    kind: "fetch",
    type: detail.type || evt.type,
    element: toElementLabel(detail.el),
    argsRaw: toDebugValue(detail.argsRaw || {})
  }

  if (entry.type === "started") entry.signals = signalSnapshot()
  rememberEvent(entry)
})()
`

const signalCountExpression = (stateName: DatastarDebuggerStateName): string =>
  `Object.keys($).filter((key) => key !== ${JSON.stringify(stateName)}).length + " signals"`

const signalsTextExpression = (stateName: DatastarDebuggerStateName): string => `
(() => {
  ${debugValueSource}
  ${signalSnapshotSource(stateName)}
  ${stringifySource}
  ${matcherSource(stateName)}

  const snapshot = signalSnapshot()
  if (!search) return toDebugJson(snapshot)

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
  return pruned === noMatch ? "No signals match search." : toDebugJson(pruned)
})()
`

const eventsHtmlExpression = (stateName: DatastarDebuggerStateName): string => `
(() => {
  ${stringifySource}
  ${matcherSource(stateName)}
  ${htmlEscapeSource}

  const events = Array.from(${signalRef(stateName)}.events || [])
  const eventLabel = (event) => event.kind === "signal" ? "signal patch" : event.type
  const eventText = (event) => {
    if (event.kind === "signal") return [event.at, eventLabel(event), toDebugJson(event.patch)].join(" ")
    return [event.at, event.type, event.element, toDebugJson(event.argsRaw), toDebugJson(event.signals || {})].join(" ")
  }
  const renderEvent = (event) => [
    '<details class="dsk-debug-event">',
      '<summary>',
        '<span class="dsk-debug-time">', escapeHtml(event.at), '</span>',
        '<span class="dsk-debug-kind">', escapeHtml(eventLabel(event)), '</span>',
        event.kind === "fetch" ? '<span class="dsk-debug-source">' + escapeHtml(event.element) + '</span>' : '',
      '</summary>',
      '<pre>', escapeHtml(toDebugJson(event)), '</pre>',
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
  const title = props.title ?? "Datastar debugger"

  return h(
    "section",
    {
      id: props.id ?? DEBUGGER_ID,
      class: rootClassName(props),
      style: props.style,
      "data-signals__ifmissing": initialSignals(stateName),
      "data-on-signal-patch": signalPatchExpression(stateName, maxEvents),
      "data-on-signal-patch-filter": `{exclude: /^${stateName}(\\.|$)/}`,
      "data-on:datastar-fetch__document": fetchExpression(stateName, maxEvents)
    },
    h("style", {}, debuggerStyles),
    h(
      "details",
      { open: props.open ?? true },
      h(
        "summary",
        {},
        h("span", { class: "dsk-debug-title" }, title),
        pill({ "data-text": signalCountExpression(stateName) }, "0 signals"),
        pill({ "data-text": `${signalRef(stateName)}.events.length + " events"` }, "0 events"),
        pill(
          {
            "data-kind": "warn",
            "data-show": `${signalRef(stateName)}.paused`
          },
          "paused"
        )
      ),
      h(
        "div",
        { class: "dsk-debug-body" },
        h(
          "div",
          { class: "dsk-debug-tabs", role: "tablist" },
          tabButton({ stateName, tab: "signals", label: "Signals" }),
          tabButton({ stateName, tab: "events", label: "Events" })
        ),
        h(
          "div",
          { class: "dsk-debug-controls" },
          h("input", {
            type: "search",
            placeholder: "Search or /regex/i",
            "aria-label": "Search debugger",
            "data-bind": `${stateName}.search`
          }),
          h(
            "button",
            {
              type: "button",
              "data-on:click": `${signalRef(stateName)}.paused = !${signalRef(stateName)}.paused`,
              "data-attr:aria-pressed": `${signalRef(stateName)}.paused`,
              "data-text": `${signalRef(stateName)}.paused ? "Resume" : "Pause"`
            },
            "Pause"
          ),
          h(
            "button",
            {
              type: "button",
              "data-on:click": `${signalRef(stateName)}.events = []`
            },
            "Clear"
          )
        ),
        tabPanel({
          stateName,
          tab: "signals",
          title: "Signals",
          children: h("pre", { "data-text": signalsTextExpression(stateName) }, "{}")
        }),
        tabPanel({
          stateName,
          tab: "events",
          title: "Events",
          children: h("div", {
            class: "dsk-debug-events",
            "data-effect": eventsHtmlExpression(stateName)
          })
        })
      )
    )
  )
}
