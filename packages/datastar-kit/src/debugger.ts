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
  readonly argsRaw: Readonly<Record<string, string>>
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

const localStateNamePattern = /^_[A-Za-z][A-Za-z0-9_]*$/

const debuggerStyles = `
.datastar-kit-debugger {
  display: contents;
  color-scheme: dark;
  font: 12px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.datastar-kit-debugger * { box-sizing: border-box; }
.datastar-kit-debugger details {
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
.datastar-kit-debugger details:not([open]) { width: auto; }
.datastar-kit-debugger summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  cursor: pointer;
  padding: 0.65rem 0.75rem;
  list-style: none;
  font-weight: 700;
}
.datastar-kit-debugger summary::-webkit-details-marker { display: none; }
.datastar-kit-debugger .dsk-debug-title { margin-right: auto; }
.datastar-kit-debugger .dsk-debug-pill {
  border: 1px solid #334155;
  border-radius: 999px;
  background: #0f172a;
  color: #94a3b8;
  padding: 0.1rem 0.45rem;
  font-size: 11px;
  font-weight: 650;
}
.datastar-kit-debugger .dsk-debug-pill[data-kind="warn"] { color: #fbbf24; }
.datastar-kit-debugger .dsk-debug-body {
  display: grid;
  gap: 0.7rem;
  padding: 0.75rem;
  border-top: 1px solid #334155;
}
.datastar-kit-debugger .dsk-debug-controls,
.datastar-kit-debugger .dsk-debug-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}
.datastar-kit-debugger input,
.datastar-kit-debugger button {
  border: 1px solid #334155;
  border-radius: 0.45rem;
  background: #0f172a;
  color: #e2e8f0;
  font: inherit;
  padding: 0.35rem 0.55rem;
}
.datastar-kit-debugger input { flex: 1 1 12rem; }
.datastar-kit-debugger button { cursor: pointer; }
.datastar-kit-debugger button:hover,
.datastar-kit-debugger button[aria-selected="true"] { border-color: #38bdf8; }
.datastar-kit-debugger button[aria-pressed="true"] {
  border-color: #fbbf24;
  color: #fbbf24;
}
.datastar-kit-debugger .dsk-debug-panel { display: grid; gap: 0.45rem; }
.datastar-kit-debugger h3 {
  margin: 0;
  color: #94a3b8;
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.datastar-kit-debugger pre {
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
.datastar-kit-debugger .dsk-debug-events {
  display: grid;
  gap: 0.4rem;
}
.datastar-kit-debugger .dsk-debug-event {
  position: static;
  width: auto;
  max-height: none;
  overflow: visible;
  border: 1px solid #1e293b;
  border-radius: 0.55rem;
  background: #0f172a;
  box-shadow: none;
}
.datastar-kit-debugger .dsk-debug-event summary {
  padding: 0.5rem 0.6rem;
  border: 0;
  font-weight: 500;
}
.datastar-kit-debugger .dsk-debug-event pre {
  max-height: 14rem;
  border: 0;
  border-top: 1px solid #1e293b;
  border-radius: 0;
}
.datastar-kit-debugger .dsk-debug-time,
.datastar-kit-debugger .dsk-debug-source,
.datastar-kit-debugger .dsk-debug-empty { color: #94a3b8; }
.datastar-kit-debugger .dsk-debug-kind { color: #38bdf8; }
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
  Number.isInteger(value) && value !== undefined && value > 0 ? value : 100

const className = (props: DatastarDebuggerProps): string =>
  ["datastar-kit-debugger", props.class, props.className].filter(Boolean).join(" ")

export const datastarDebuggerDefaults = (): DatastarDebuggerState => ({
  tab: "signals",
  search: "",
  paused: false,
  events: []
})

const initialSignals = (stateName: DatastarDebuggerStateName): string =>
  JSON.stringify({ [stateName]: datastarDebuggerDefaults() })

const signalRef = (stateName: DatastarDebuggerStateName): string => `$${stateName}`

const jsonTextSource = `
const text = (value) => {
  try {
    const json = JSON.stringify(value, null, 2)
    return json === undefined ? String(value) : json
  } catch {
    return String(value)
  }
}
`

const matcherSource = (stateName: DatastarDebuggerStateName): string => `
const search = String(${signalRef(stateName)}.search || "").trim()
const makeMatcher = () => {
  if (!search) return () => true
  const regex = search.match(/^\\/(.*)\\/([a-z]*)$/i)
  if (regex) {
    try {
      const re = new RegExp(regex[1], regex[2])
      return (value) => re.test(String(value))
    } catch {
      return () => false
    }
  }
  const lowered = search.toLowerCase()
  return (value) => String(value).toLowerCase().includes(lowered)
}
const matches = makeMatcher()
`

const escapeHtmlSource = `
const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;")
`

const valueToolsSource = `
const maxStringLength = 2000
const seen = new WeakSet()
const clone = (value) => {
  if (typeof value === "string") {
    return value.length > maxStringLength ? value.slice(0, maxStringLength) + "… truncated" : value
  }
  if (typeof value === "function") return "[Function]"
  if (typeof value === "bigint") return String(value) + "n"
  if (typeof Element !== "undefined" && value instanceof Element) {
    return value.id ? "#" + value.id : "<" + String(value.tagName || "element").toLowerCase() + ">"
  }
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[Circular]"
    seen.add(value)
    if (Array.isArray(value)) return value.map(clone)
    const out = {}
    for (const [key, item] of Object.entries(value)) out[key] = clone(item)
    return out
  }
  return value
}
`

const snapshotSource = (stateName: DatastarDebuggerStateName): string => `
const snapshotSignals = () => {
  ${valueToolsSource}
  const snapshot = {}
  for (const [key, value] of Object.entries($)) {
    if (key !== ${JSON.stringify(stateName)}) snapshot[key] = clone(value)
  }
  return snapshot
}
`

const signalPatchExpression = (stateName: DatastarDebuggerStateName, maxEvents: number): string => `
(() => {
  const debug = ${signalRef(stateName)}
  if (debug.paused) return
  ${valueToolsSource}
  debug.events.unshift({
    at: new Date().toLocaleTimeString(),
    kind: "signal",
    patch: clone(patch)
  })
  debug.events.length = Math.min(debug.events.length, ${maxEvents})
})()
`

const fetchExpression = (stateName: DatastarDebuggerStateName, maxEvents: number): string => `
(() => {
  const debug = ${signalRef(stateName)}
  if (debug.paused) return
  const detail = evt.detail || {}
  const eventElement = detail.el
  const element = eventElement
    ? (eventElement.id ? "#" + eventElement.id : "<" + String(eventElement.tagName || "element").toLowerCase() + ">")
    : "document"
  ${valueToolsSource}
  const entry = {
    at: new Date().toLocaleTimeString(),
    kind: "fetch",
    type: detail.type || evt.type,
    element,
    argsRaw: clone(detail.argsRaw || {})
  }
  if (entry.type === "started") {
    const snapshot = {}
    for (const [key, value] of Object.entries($)) {
      if (key !== ${JSON.stringify(stateName)}) snapshot[key] = clone(value)
    }
    entry.signals = snapshot
  }
  debug.events.unshift(entry)
  debug.events.length = Math.min(debug.events.length, ${maxEvents})
})()
`

const signalCountExpression = (stateName: DatastarDebuggerStateName): string =>
  `Object.keys($).filter((key) => key !== ${JSON.stringify(stateName)}).length + " signals"`

const signalsTextExpression = (stateName: DatastarDebuggerStateName): string => `
(() => {
  ${snapshotSource(stateName)}
  ${jsonTextSource}
  ${matcherSource(stateName)}
  const snapshot = snapshotSignals()
  if (!search) return text(snapshot)

  const missing = Symbol("missing")
  const prune = (value, path = "") => {
    if (matches(path)) return value
    if (value && typeof value === "object") {
      const out = Array.isArray(value) ? [] : {}
      let found = false
      for (const [key, item] of Object.entries(value)) {
        const child = prune(item, path ? path + "." + key : key)
        if (child !== missing) {
          if (Array.isArray(out)) out.push(child)
          else out[key] = child
          found = true
        }
      }
      return found ? out : missing
    }
    return matches(path + " " + text(value)) ? value : missing
  }

  const pruned = prune(snapshot)
  return pruned === missing ? "No signals match search." : text(pruned)
})()
`

const eventsHtmlExpression = (stateName: DatastarDebuggerStateName): string => `
(() => {
  ${jsonTextSource}
  ${matcherSource(stateName)}
  ${escapeHtmlSource}
  const events = Array.from(${signalRef(stateName)}.events || [])
  const rowText = (event) => {
    if (event.kind === "signal") return [event.at, "signal patch", text(event.patch)].join(" ")
    return [event.at, event.type, event.element, text(event.argsRaw), text(event.signals || {})].join(" ")
  }
  const visible = search ? events.filter((event) => matches(rowText(event))) : events
  if (visible.length === 0) {
    el.innerHTML = '<p class="dsk-debug-empty">' + (events.length === 0 ? "No debugger events yet." : "No events match search.") + '</p>'
    return
  }
  el.innerHTML = visible.map((event) => {
    const kind = event.kind === "signal" ? "signal patch" : event.type
    const source = event.kind === "fetch" ? " " + event.element : ""
    return '<details class="dsk-debug-event">'
      + '<summary>'
      + '<span class="dsk-debug-time">' + escapeHtml(event.at) + '</span>'
      + '<span class="dsk-debug-kind">' + escapeHtml(kind) + '</span>'
      + (source ? '<span class="dsk-debug-source">' + escapeHtml(source) + '</span>' : '')
      + '</summary>'
      + '<pre>' + escapeHtml(text(event)) + '</pre>'
      + '</details>'
  }).join("")
})()
`

const tabButton = (
  stateName: DatastarDebuggerStateName,
  tab: DatastarDebuggerTab,
  label: string
): HtmlChild =>
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
      id: props.id ?? "datastar-kit-debugger",
      class: className(props),
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
        h(
          "span",
          { class: "dsk-debug-pill", "data-text": signalCountExpression(stateName) },
          "0 signals"
        ),
        h(
          "span",
          {
            class: "dsk-debug-pill",
            "data-text": `${signalRef(stateName)}.events.length + " events"`
          },
          "0 events"
        ),
        h(
          "span",
          {
            class: "dsk-debug-pill",
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
          tabButton(stateName, "signals", "Signals"),
          tabButton(stateName, "events", "Events")
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
        h(
          "section",
          {
            class: "dsk-debug-panel",
            role: "tabpanel",
            "data-show": `${signalRef(stateName)}.tab === "signals"`
          },
          h("h3", {}, "Signals"),
          h("pre", { "data-text": signalsTextExpression(stateName) }, "{}")
        ),
        h(
          "section",
          {
            class: "dsk-debug-panel",
            role: "tabpanel",
            "data-show": `${signalRef(stateName)}.tab === "events"`
          },
          h("h3", {}, "Events"),
          h("div", { class: "dsk-debug-events", "data-effect": eventsHtmlExpression(stateName) })
        )
      )
    )
  )
}
