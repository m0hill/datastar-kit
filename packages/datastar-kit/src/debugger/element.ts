import { DatastarDebuggerBrowserEnvironment } from "./browser-environment.js"
import { DebuggerFormat } from "./format.js"
import { DatastarDebuggerSession, type DatastarDebuggerSessionIntent } from "./session.js"
import { debuggerStyles } from "./styles.js"
import type {
  DatastarDebuggerEventEntry,
  DatastarDebuggerState,
  DatastarDebuggerTab
} from "./types.js"

/** Tag name used by the debugger Web Component. */
export const DATASTAR_DEBUGGER_ELEMENT_NAME = "datastar-kit-debugger" as const

const OPEN_ATTRIBUTE = "open"
const MAX_EVENTS_ATTRIBUTE = "max-events"
const MAX_SNAPSHOTS_ATTRIBUTE = "max-snapshots"
interface DebuggerElements {
  readonly details: HTMLDetailsElement
  readonly signalCount: HTMLElement
  readonly eventCount: HTMLElement
  readonly pausedPill: HTMLElement
  readonly travelPill: HTMLElement
  readonly search: HTMLInputElement
  readonly pauseButton: HTMLButtonElement
  readonly clearEventsButton: HTMLButtonElement
  readonly clearSnapshotsButton: HTMLButtonElement
  readonly liveButton: HTMLButtonElement
  readonly tabButtons: readonly HTMLButtonElement[]
  readonly panels: readonly HTMLElement[]
  readonly signals: HTMLElement
  readonly events: HTMLElement
  readonly timelineRange: HTMLInputElement
  readonly timelineStatus: HTMLElement
}

const template = `
<style>${debuggerStyles}</style>
<details>
  <summary>
    <span class="dsk-debug-label">Debug</span>
    <span class="dsk-debug-pill" data-role="signal-count">0 signals</span>
    <span class="dsk-debug-pill" data-role="event-count">0 events</span>
    <span class="dsk-debug-pill" data-kind="warn" data-role="paused-pill" hidden>paused</span>
    <span class="dsk-debug-pill" data-kind="warn" data-role="travel-pill" hidden>time travel</span>
  </summary>
  <div class="dsk-debug-body">
    <div class="dsk-debug-tabs" role="tablist">
      <button type="button" data-tab="signals" role="tab">Signals</button>
      <button type="button" data-tab="events" role="tab">Events</button>
      <button type="button" data-tab="timeline" role="tab">Timeline</button>
    </div>
    <div class="dsk-debug-controls">
      <input data-role="search" type="search" placeholder="Search or /regex/i" aria-label="Search debugger">
      <input class="dsk-timeline-range" data-role="timeline-range" type="range" min="0" max="0" value="0" aria-label="Timeline position" hidden>
      <button type="button" data-action="pause" aria-label="Pause debugger" title="Pause">Ⅱ</button>
      <button type="button" data-action="clear-events" aria-label="Clear events" title="Clear events">⌫</button>
      <button type="button" data-action="clear-snapshots" aria-label="Clear snapshots" title="Clear snapshots">⌫</button>
      <button type="button" class="dsk-debug-live" data-action="live" aria-label="Return to live" title="Return to live">●</button>
    </div>
    <section class="dsk-debug-panel" data-panel="signals" role="tabpanel">
      <pre data-role="signals">{}</pre>
    </section>
    <section class="dsk-debug-panel" data-panel="events" role="tabpanel" hidden>
      <div class="dsk-debug-events" data-role="events"></div>
    </section>
    <section class="dsk-debug-panel" data-panel="timeline" role="tabpanel" hidden>
      <p class="dsk-debug-timeline-status" data-role="timeline-status">0 snapshots</p>
    </section>
  </div>
</details>
`

/** Creates the browser class registered for `<datastar-kit-debugger>`. */
export const createDatastarDebuggerElementClass = (): CustomElementConstructor =>
  class DatastarDebuggerElement extends HTMLElement {
    static get observedAttributes(): string[] {
      return [OPEN_ATTRIBUTE]
    }

    private readonly elements: DebuggerElements
    private session: DatastarDebuggerSession | undefined
    private readonly cleanup: Array<() => void> = []
    private connected = false

    constructor() {
      super()
      const shadow = this.attachShadow({ mode: "open" })
      shadow.innerHTML = template
      this.elements = readElements(shadow)
    }

    connectedCallback(): void {
      if (this.connected) return
      if (!document.body) {
        const start = (): void => this.start()
        document.addEventListener("DOMContentLoaded", start, { once: true })
        this.cleanup.push(() => document.removeEventListener("DOMContentLoaded", start))
        return
      }
      this.start()
    }

    disconnectedCallback(): void {
      queueMicrotask(() => {
        if (!this.isConnected) this.stop()
      })
    }

    attributeChangedCallback(name: string): void {
      if (name === OPEN_ATTRIBUTE) this.elements.details.open = readOpen(this)
    }

    private start(): void {
      if (this.connected || !document.body) return
      const firstDebugger = document.querySelector(DATASTAR_DEBUGGER_ELEMENT_NAME)
      if (firstDebugger && firstDebugger !== this) {
        console.warn("Only one Datastar debugger can run; removing the duplicate element.")
        this.remove()
        return
      }

      this.connected = true
      const maxEvents = readPositiveInteger(this, MAX_EVENTS_ATTRIBUTE)
      const maxSnapshots = readPositiveInteger(this, MAX_SNAPSHOTS_ATTRIBUTE)
      this.elements.details.open = readOpen(this)
      this.session = new DatastarDebuggerSession({
        environment: new DatastarDebuggerBrowserEnvironment(this),
        ...(maxEvents === undefined ? {} : { maxEvents }),
        ...(maxSnapshots === undefined ? {} : { maxSnapshots }),
        onStateChange: () => this.render()
      })
      this.bindControls()
      this.session.start()
      this.render()
    }

    private stop(): void {
      if (!this.connected && this.cleanup.length === 0) return
      this.connected = false
      for (const remove of this.cleanup.splice(0)) remove()
      this.session?.dispose()
      this.session = undefined
    }

    private bindControls(): void {
      for (const button of this.elements.tabButtons) {
        this.listen(button, "click", () => {
          const tab = button.dataset.tab
          if (isDebuggerTab(tab)) this.send({ _tag: "setTab", tab })
        })
      }
      this.listen(this.elements.search, "input", () => {
        this.send({ _tag: "setSearch", search: this.elements.search.value })
      })
      this.listen(this.elements.pauseButton, "click", () => {
        this.send({ _tag: "togglePaused" })
      })
      this.listen(this.elements.clearEventsButton, "click", () => {
        this.send({ _tag: "clearEvents" })
      })
      this.listen(this.elements.clearSnapshotsButton, "click", () => {
        this.send({ _tag: "clearSnapshots" })
      })
      this.listen(this.elements.liveButton, "click", () => this.send({ _tag: "goLive" }))
      this.listen(this.elements.timelineRange, "input", () => {
        this.send({
          _tag: "selectSnapshot",
          index: this.elements.timelineRange.valueAsNumber
        })
      })
    }

    private listen(target: EventTarget, type: string, listener: EventListener): void {
      target.addEventListener(type, listener)
      this.cleanup.push(() => target.removeEventListener(type, listener))
    }

    private send(intent: DatastarDebuggerSessionIntent): void {
      this.session?.send(intent)
    }

    private render(): void {
      const state = this.session?.state()
      if (!state) return
      this.elements.signalCount.textContent = countLabel(
        Object.keys(state.signals).length,
        "signal"
      )
      this.elements.eventCount.textContent = countLabel(state.events.length, "event")
      this.elements.pausedPill.hidden = !state.paused
      this.elements.travelPill.hidden = state.travel._tag === "live"
      this.elements.search.hidden = state.tab === "timeline"
      this.elements.timelineRange.hidden = state.tab !== "timeline"
      this.elements.pauseButton.setAttribute("aria-pressed", String(state.paused))
      this.elements.pauseButton.setAttribute(
        "aria-label",
        state.paused ? "Resume debugger" : "Pause debugger"
      )
      this.elements.pauseButton.title = state.paused ? "Resume" : "Pause"
      this.elements.pauseButton.textContent = state.paused ? "▶" : "Ⅱ"
      this.elements.clearEventsButton.hidden = state.tab !== "events"
      this.elements.clearSnapshotsButton.hidden =
        state.tab !== "timeline" || state.travel._tag !== "live"
      this.elements.liveButton.hidden = state.tab !== "timeline" || state.travel._tag === "live"

      for (const button of this.elements.tabButtons) {
        button.setAttribute("aria-selected", String(button.dataset.tab === state.tab))
      }
      for (const panel of this.elements.panels) panel.hidden = panel.dataset.panel !== state.tab

      this.renderSignals(state)
      this.renderEvents(state)
      this.renderSlider(state)
    }

    private renderSignals(state: DatastarDebuggerState): void {
      const signals = DebuggerFormat.toDebugRecord(state.signals)
      const visible = DebuggerFormat.filterSignals(signals, state.search.trim())
      if (DebuggerFormat.isNoSignalMatch(visible)) {
        this.elements.signals.textContent = "No signals match search."
        return
      }
      this.elements.signals.textContent = DebuggerFormat.toDebugJson(visible)
    }

    private renderEvents(state: DatastarDebuggerState): void {
      const matches = DebuggerFormat.createMatcher(state.search.trim())
      const events = state.search
        ? state.events.filter((event) => matches(DebuggerFormat.eventText(event)))
        : state.events
      if (events.length === 0) {
        const empty = document.createElement("p")
        empty.className = "dsk-debug-empty"
        empty.textContent =
          state.events.length === 0 ? "No debugger events yet." : "No events match search."
        this.elements.events.replaceChildren(empty)
        return
      }
      this.elements.events.replaceChildren(...events.map(renderEvent))
    }

    private renderSlider(state: DatastarDebuggerState): void {
      const latest = Math.max(state.snapshots.length - 1, 0)
      const index = state.travel._tag === "restored" ? state.travel.index : latest
      this.elements.timelineRange.max = String(latest)
      this.elements.timelineRange.value = String(index)
      this.elements.timelineRange.disabled = state.snapshots.length < 2
      this.elements.timelineStatus.textContent = timelineStatus(state, index)
    }
  }

const renderEvent = (event: DatastarDebuggerEventEntry): HTMLElement => {
  const details = document.createElement("details")
  details.className = "dsk-debug-event"
  const summary = document.createElement("summary")
  summary.append(
    textSpan("dsk-debug-time", event.at),
    textSpan("dsk-debug-kind", event.kind === "signal" ? "signal patch" : event.type)
  )
  const kind = summary.querySelector(".dsk-debug-kind")
  kind?.setAttribute("data-kind", event.kind)
  if (event.kind === "fetch") {
    summary.append(textSpan("dsk-debug-source", event.target ?? event.element))
  }
  details.append(summary)

  const body = document.createElement("div")
  const display = DebuggerFormat.eventForDisplay(event)
  if (
    display.kind === "fetch" &&
    display.type === "datastar-patch-elements" &&
    typeof display.argsRaw.elements === "string"
  ) {
    const metadata = {
      ...display,
      argsRaw: { ...display.argsRaw, elements: "[formatted below]" }
    }
    body.append(
      preformatted(DebuggerFormat.toDebugJson(metadata)),
      divider(),
      preformatted(DebuggerFormat.formatPatchHtml(display.argsRaw.elements), "html")
    )
  } else {
    body.append(preformatted(DebuggerFormat.toDebugJson(display)))
  }
  details.append(body)
  return details
}

const textSpan = (className: string, text: string): HTMLSpanElement => {
  const span = document.createElement("span")
  span.className = className
  span.textContent = text
  return span
}

const preformatted = (text: string, content?: "html"): HTMLPreElement => {
  const pre = document.createElement("pre")
  if (content) pre.dataset.content = content
  pre.textContent = text
  return pre
}

const divider = (): HTMLDivElement => {
  const element = document.createElement("div")
  element.className = "dsk-debug-divider"
  return element
}

const readElements = (shadow: ShadowRoot): DebuggerElements => ({
  details: requireElement(shadow, "details", HTMLDetailsElement),
  signalCount: requireElement(shadow, '[data-role="signal-count"]', HTMLElement),
  eventCount: requireElement(shadow, '[data-role="event-count"]', HTMLElement),
  pausedPill: requireElement(shadow, '[data-role="paused-pill"]', HTMLElement),
  travelPill: requireElement(shadow, '[data-role="travel-pill"]', HTMLElement),
  search: requireElement(shadow, '[data-role="search"]', HTMLInputElement),
  pauseButton: requireElement(shadow, '[data-action="pause"]', HTMLButtonElement),
  clearEventsButton: requireElement(shadow, '[data-action="clear-events"]', HTMLButtonElement),
  clearSnapshotsButton: requireElement(
    shadow,
    '[data-action="clear-snapshots"]',
    HTMLButtonElement
  ),
  liveButton: requireElement(shadow, '[data-action="live"]', HTMLButtonElement),
  tabButtons: Array.from(shadow.querySelectorAll("[data-tab]")).filter(
    (element): element is HTMLButtonElement => element instanceof HTMLButtonElement
  ),
  panels: Array.from(shadow.querySelectorAll("[data-panel]")).filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  ),
  signals: requireElement(shadow, '[data-role="signals"]', HTMLElement),
  events: requireElement(shadow, '[data-role="events"]', HTMLElement),
  timelineRange: requireElement(shadow, '[data-role="timeline-range"]', HTMLInputElement),
  timelineStatus: requireElement(shadow, '[data-role="timeline-status"]', HTMLElement)
})

const requireElement = <ElementType extends Element>(
  root: ParentNode,
  selector: string,
  constructor: { new (...arguments_: never[]): ElementType }
): ElementType => {
  const element = root.querySelector(selector)
  if (!(element instanceof constructor)) {
    throw new Error(`Datastar debugger template is missing ${selector}`)
  }
  return element
}

const readOpen = (element: HTMLElement): boolean => element.hasAttribute(OPEN_ATTRIBUTE)

const readPositiveInteger = (element: HTMLElement, name: string): number | undefined => {
  const raw = element.getAttribute(name)
  if (raw === null) return undefined
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : undefined
}

const isDebuggerTab = (value: string | undefined): value is DatastarDebuggerTab =>
  value === "signals" || value === "events" || value === "timeline"

const countLabel = (count: number, noun: string): string =>
  `${count} ${noun}${count === 1 ? "" : "s"}`

const timelineStatus = (state: DatastarDebuggerState, index: number): string => {
  const count = state.snapshots.length
  if (count === 0) return "0 snapshots"
  if (state.travel._tag === "live") {
    return `${count} ${count === 1 ? "snapshot" : "snapshots"} · live`
  }
  const snapshot = state.snapshots[index]
  return snapshot ? `${index + 1}/${count} · ${snapshot.at} · ${snapshot.label}` : "no snapshot"
}
