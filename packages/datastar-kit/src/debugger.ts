import { h, type HtmlChild } from "./html.js"

export const DATASTAR_DEBUGGER_STATE_NAME = "_datastarKitDebugger" as const

export type DatastarDebuggerStateName = `_${string}`
export type DatastarDebuggerTab = "signals" | "patches" | "fetch"

export interface DatastarDebuggerSignalPatchEntry {
  readonly at: string
  readonly paths: readonly string[]
  readonly patch: unknown
}

export interface DatastarDebuggerFetchEntry {
  readonly at: string
  readonly type: string
  readonly element: string
  readonly argsRaw: Readonly<Record<string, string>>
}

export interface DatastarDebuggerState {
  readonly tab: DatastarDebuggerTab
  readonly filter: string
  readonly paused: boolean
  readonly status: string
  readonly patches: readonly DatastarDebuggerSignalPatchEntry[]
  readonly events: readonly DatastarDebuggerFetchEntry[]
}

export interface DatastarDebuggerProps {
  /** Container `id`. @defaultValue `"datastar-kit-debugger"` */
  readonly id?: string
  /** Local signal name used by the debugger. Must be one underscore-prefixed root signal. */
  readonly stateName?: DatastarDebuggerStateName
  /** Whether the `<details>` panel starts open. @defaultValue `true` */
  readonly open?: boolean
  /** Maximum signal patch and fetch events retained in browser signal state. @defaultValue `100` */
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
  --dsk-debug-bg: #020617;
  --dsk-debug-panel: #0f172a;
  --dsk-debug-panel-soft: #111827;
  --dsk-debug-border: #334155;
  --dsk-debug-text: #e2e8f0;
  --dsk-debug-muted: #94a3b8;
  --dsk-debug-accent: #38bdf8;
  --dsk-debug-warning: #fbbf24;
  color-scheme: dark;
  font: 12px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
.datastar-kit-debugger * { box-sizing: border-box; }
.datastar-kit-debugger details {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 2147483647;
  width: min(94vw, 46rem);
  max-height: min(82vh, 44rem);
  overflow: hidden;
  border: 1px solid var(--dsk-debug-border);
  border-radius: 1rem;
  background: color-mix(in srgb, var(--dsk-debug-bg), transparent 4%);
  color: var(--dsk-debug-text);
  box-shadow: 0 24px 70px rgb(0 0 0 / 42%);
}
.datastar-kit-debugger details:not([open]) {
  width: auto;
}
.datastar-kit-debugger summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  cursor: pointer;
  padding: 0.75rem;
  border-bottom: 1px solid var(--dsk-debug-border);
  font-weight: 750;
  list-style: none;
}
.datastar-kit-debugger details:not([open]) summary {
  border-bottom: 0;
}
.datastar-kit-debugger summary::-webkit-details-marker { display: none; }
.datastar-kit-debugger .dsk-debug-title {
  margin-right: auto;
}
.datastar-kit-debugger .dsk-debug-pill {
  display: inline-flex;
  align-items: center;
  min-height: 1.3rem;
  border-radius: 999px;
  background: var(--dsk-debug-panel);
  color: var(--dsk-debug-muted);
  padding: 0.1rem 0.5rem;
  font-weight: 650;
}
.datastar-kit-debugger .dsk-debug-pill[data-kind="warn"] {
  color: var(--dsk-debug-warning);
}
.datastar-kit-debugger .dsk-debug-body {
  display: grid;
  gap: 0.65rem;
  max-height: calc(min(82vh, 44rem) - 3rem);
  overflow: auto;
  padding: 0.75rem;
}
.datastar-kit-debugger .dsk-debug-controls,
.datastar-kit-debugger .dsk-debug-tabs,
.datastar-kit-debugger .dsk-debug-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
}
.datastar-kit-debugger input,
.datastar-kit-debugger button {
  border: 1px solid var(--dsk-debug-border);
  border-radius: 0.5rem;
  background: var(--dsk-debug-panel);
  color: var(--dsk-debug-text);
  font: inherit;
  padding: 0.42rem 0.6rem;
}
.datastar-kit-debugger input { flex: 1 1 15rem; }
.datastar-kit-debugger button { cursor: pointer; }
.datastar-kit-debugger button:hover,
.datastar-kit-debugger button[aria-selected="true"] {
  border-color: var(--dsk-debug-accent);
  color: white;
}
.datastar-kit-debugger button[aria-pressed="true"] {
  border-color: var(--dsk-debug-warning);
  color: var(--dsk-debug-warning);
}
.datastar-kit-debugger .dsk-debug-tabs button { flex: 1 1 8rem; }
.datastar-kit-debugger .dsk-debug-panel {
  display: grid;
  gap: 0.5rem;
}
.datastar-kit-debugger .dsk-debug-help {
  color: var(--dsk-debug-muted);
}
.datastar-kit-debugger .dsk-debug-table-wrap {
  max-height: 30rem;
  overflow: auto;
  border: 1px solid var(--dsk-debug-border);
  border-radius: 0.6rem;
  background: var(--dsk-debug-panel-soft);
}
.datastar-kit-debugger table {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.datastar-kit-debugger th,
.datastar-kit-debugger td {
  border-bottom: 1px solid color-mix(in srgb, var(--dsk-debug-border), transparent 35%);
  padding: 0.5rem 0.6rem;
  text-align: left;
  vertical-align: top;
}
.datastar-kit-debugger th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--dsk-debug-panel);
  color: var(--dsk-debug-muted);
  font-weight: 750;
}
.datastar-kit-debugger td code,
.datastar-kit-debugger td pre {
  font: 11px/1.5 "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
.datastar-kit-debugger td code {
  overflow-wrap: anywhere;
  color: var(--dsk-debug-accent);
}
.datastar-kit-debugger td pre {
  max-width: 32rem;
  max-height: 12rem;
  overflow: auto;
  margin: 0;
  color: var(--dsk-debug-text);
  white-space: pre-wrap;
}
.datastar-kit-debugger .dsk-debug-empty {
  color: var(--dsk-debug-muted);
}
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
  filter: "",
  paused: false,
  status: "",
  patches: [],
  events: []
})

const initialSignals = (stateName: DatastarDebuggerStateName): string =>
  JSON.stringify({ [stateName]: datastarDebuggerDefaults() })

const signalRef = (stateName: DatastarDebuggerStateName): string => `$${stateName}`

const matcherSource = `
const makeMatcher = () => {
  const raw = String(debug.filter || "").trim()
  if (!raw) return () => true
  const regex = raw.match(/^\\/(.*)\\/([a-z]*)$/i)
  if (regex) {
    try {
      const re = new RegExp(regex[1], regex[2])
      return (value) => re.test(value)
    } catch {}
  }
  const lowered = raw.toLowerCase()
  return (value) => String(value).toLowerCase().includes(lowered)
}
const matches = makeMatcher()
`

const safeValueSource = `
const seen = new WeakSet()
const isElement = (value) => typeof Element !== "undefined" && value instanceof Element
const clean = (value) => {
  if (isElement(value)) return value.id ? "#" + value.id : "<" + value.tagName.toLowerCase() + ">"
  if (typeof value === "function") return "[Function]"
  if (typeof value === "bigint") return String(value) + "n"
  if (value && typeof value === "object") {
    if (seen.has(value)) return "[Circular]"
    seen.add(value)
    if (Array.isArray(value)) return value.map(clean)
    const out = {}
    for (const [key, item] of Object.entries(value)) out[key] = clean(item)
    return out
  }
  return value
}
const textValue = (value) => {
  const text = JSON.stringify(clean(value))
  return text === undefined ? String(value) : text
}
`

const escapeHtmlSource = `
const escapeHtml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;")
`

const signalPatchExpression = (stateName: DatastarDebuggerStateName, maxEvents: number): string => `
(() => {
  const debug = ${signalRef(stateName)}
  if (debug.paused) return
  const paths = (value, prefix = "") => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const entries = Object.entries(value)
      if (entries.length === 0) return [prefix]
      return entries.flatMap(([key, item]) => paths(item, prefix ? prefix + "." + key : key))
    }
    return [prefix]
  }
  debug.patches.unshift({ at: new Date().toLocaleTimeString(), paths: paths(patch), patch })
  debug.patches.length = Math.min(debug.patches.length, ${maxEvents})
})()
`

const fetchExpression = (stateName: DatastarDebuggerStateName, maxEvents: number): string => `
(() => {
  const debug = ${signalRef(stateName)}
  if (debug.paused) return
  const detail = evt.detail || {}
  const el = detail.el
  const element = el ? (el.id ? "#" + el.id : (el.tagName || "").toLowerCase()) : "document"
  debug.events.unshift({
    at: new Date().toLocaleTimeString(),
    type: detail.type || evt.type,
    element,
    argsRaw: detail.argsRaw || {}
  })
  debug.events.length = Math.min(debug.events.length, ${maxEvents})
})()
`

const signalCountExpression = (stateName: DatastarDebuggerStateName): string => `
(() => {
  const isElement = (value) => typeof Element !== "undefined" && value instanceof Element
  let count = 0
  const walk = (value) => {
    if (value && typeof value === "object" && !Array.isArray(value) && !isElement(value)) {
      const entries = Object.entries(value)
      if (entries.length === 0) {
        count++
        return
      }
      for (const [, item] of entries) walk(item)
      return
    }
    count++
  }
  for (const [key, value] of Object.entries($)) {
    if (key !== ${JSON.stringify(stateName)}) walk(value)
  }
  return count + " signals"
})()
`

const signalsRowsExpression = (stateName: DatastarDebuggerStateName): string => `
(() => {
  const debug = ${signalRef(stateName)}
  ${matcherSource}
  ${safeValueSource}
  ${escapeHtmlSource}
  const rows = []
  const walk = (value, path) => {
    if (value && typeof value === "object" && !Array.isArray(value) && !isElement(value)) {
      const entries = Object.entries(value)
      if (entries.length === 0) {
        rows.push({ path, value: "{}" })
        return
      }
      for (const [key, item] of entries) walk(item, path ? path + "." + key : key)
      return
    }
    rows.push({ path, value: textValue(value) })
  }
  for (const [key, value] of Object.entries($)) {
    if (key !== ${JSON.stringify(stateName)}) walk(value, key)
  }
  const visible = rows
    .filter((row) => matches(row.path + " " + row.value))
    .sort((left, right) => left.path.localeCompare(right.path))
  el.innerHTML = visible.length === 0
    ? '<tr><td class="dsk-debug-empty" colspan="2">' + (rows.length === 0 ? "No signals yet." : "No signals match the current filter.") + '</td></tr>'
    : visible.map((row) => '<tr><td><code>' + escapeHtml(row.path) + '</code></td><td><pre>' + escapeHtml(row.value) + '</pre></td></tr>').join("")
})()
`

const signalPatchRowsExpression = (stateName: DatastarDebuggerStateName): string => `
(() => {
  const debug = ${signalRef(stateName)}
  ${matcherSource}
  ${escapeHtmlSource}
  const entries = Array.from(debug.patches || [])
  const visible = entries.filter((entry) => matches(JSON.stringify(entry)))
  el.innerHTML = visible.length === 0
    ? '<tr><td class="dsk-debug-empty" colspan="3">' + (entries.length === 0 ? "No signal patches yet." : "No events match the current filter.") + '</td></tr>'
    : visible.map((entry) => {
      const paths = Array.isArray(entry.paths) ? entry.paths.join(", ") : ""
      const patch = JSON.stringify(entry.patch, null, 2)
      return '<tr><td>' + escapeHtml(entry.at) + '</td><td><code>' + escapeHtml(paths) + '</code></td><td><pre>' + escapeHtml(patch) + '</pre></td></tr>'
    }).join("")
})()
`

const fetchRowsExpression = (stateName: DatastarDebuggerStateName): string => `
(() => {
  const debug = ${signalRef(stateName)}
  ${matcherSource}
  ${escapeHtmlSource}
  const entries = Array.from(debug.events || [])
  const visible = entries.filter((entry) => matches(JSON.stringify(entry)))
  el.innerHTML = visible.length === 0
    ? '<tr><td class="dsk-debug-empty" colspan="4">' + (entries.length === 0 ? "No fetch/SSE events yet." : "No events match the current filter.") + '</td></tr>'
    : visible.map((entry) => {
      const payload = JSON.stringify(entry.argsRaw || {}, null, 2)
      return '<tr><td>' + escapeHtml(entry.at) + '</td><td><code>' + escapeHtml(entry.type) + '</code></td><td>' + escapeHtml(entry.element) + '</td><td><pre>' + escapeHtml(payload) + '</pre></td></tr>'
    }).join("")
})()
`

const copySignalsExpression = (stateName: DatastarDebuggerStateName): string => `
(() => {
  const debug = ${signalRef(stateName)}
  ${safeValueSource}
  const snapshot = {}
  for (const [key, value] of Object.entries($)) {
    if (key !== ${JSON.stringify(stateName)}) snapshot[key] = clean(value)
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2))
    debug.status = "Copied signals"
  } else {
    debug.status = "Clipboard unavailable"
  }
  setTimeout(() => { debug.status = "" }, 1500)
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

const tablePanel = (props: {
  readonly stateName: DatastarDebuggerStateName
  readonly tab: DatastarDebuggerTab
  readonly rowsExpression: string
  readonly headers: readonly string[]
  readonly emptyMessage: string
  readonly help: string
}): HtmlChild =>
  h(
    "div",
    {
      class: "dsk-debug-panel",
      role: "tabpanel",
      "data-show": `${signalRef(props.stateName)}.tab === ${JSON.stringify(props.tab)}`
    },
    h("div", { class: "dsk-debug-help" }, props.help),
    h(
      "div",
      { class: "dsk-debug-table-wrap" },
      h(
        "table",
        {},
        h(
          "thead",
          {},
          h(
            "tr",
            {},
            props.headers.map((header) => h("th", {}, header))
          )
        ),
        h(
          "tbody",
          { "data-effect": props.rowsExpression },
          h(
            "tr",
            {},
            h("td", { class: "dsk-debug-empty", colspan: props.headers.length }, props.emptyMessage)
          )
        )
      )
    )
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
            "data-text": `${signalRef(stateName)}.patches.length + " patches"`
          },
          "0 patches"
        ),
        h(
          "span",
          {
            class: "dsk-debug-pill",
            "data-text": `${signalRef(stateName)}.events.length + " fetch"`
          },
          "0 fetch"
        ),
        h(
          "span",
          {
            class: "dsk-debug-pill",
            "data-kind": "warn",
            "data-show": `${signalRef(stateName)}.paused`
          },
          "paused"
        ),
        h(
          "span",
          {
            class: "dsk-debug-pill",
            "data-show": `${signalRef(stateName)}.status`,
            "data-text": `${signalRef(stateName)}.status`
          },
          ""
        )
      ),
      h(
        "div",
        { class: "dsk-debug-body" },
        h(
          "div",
          { class: "dsk-debug-controls" },
          h("input", {
            type: "search",
            placeholder: "Filter text or /regex/i",
            "data-bind": `${stateName}.filter`
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
              "data-on:click": `${signalRef(stateName)}.patches = []; ${signalRef(stateName)}.events = []`
            },
            "Clear logs"
          )
        ),
        h(
          "div",
          { class: "dsk-debug-tabs", role: "tablist" },
          tabButton(stateName, "signals", "Signals"),
          tabButton(stateName, "patches", "Signal patches"),
          tabButton(stateName, "fetch", "Fetch/SSE")
        ),
        h(
          "div",
          { class: "dsk-debug-actions" },
          h(
            "button",
            { type: "button", "data-on:click": copySignalsExpression(stateName) },
            "Copy signals"
          )
        ),
        tablePanel({
          stateName,
          tab: "signals",
          rowsExpression: signalsRowsExpression(stateName),
          headers: ["Path", "Value"],
          emptyMessage: "No signals yet.",
          help: "Current Datastar signal paths and values."
        }),
        tablePanel({
          stateName,
          tab: "patches",
          rowsExpression: signalPatchRowsExpression(stateName),
          headers: ["Time", "Paths", "Patch"],
          emptyMessage: "No signal patches yet.",
          help: "Signal patch events as Datastar applied them."
        }),
        tablePanel({
          stateName,
          tab: "fetch",
          rowsExpression: fetchRowsExpression(stateName),
          headers: ["Time", "Type", "Element", "Payload"],
          emptyMessage: "No fetch/SSE events yet.",
          help: "Datastar fetch lifecycle and SSE patch events."
        })
      )
    )
  )
}
