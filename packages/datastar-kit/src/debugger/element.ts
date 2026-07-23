import {
  DATASTAR_DEBUGGER_BRIDGE_SELECTOR,
  DatastarDebuggerBridge,
  type DatastarDebuggerBridgeSink
} from "./bridge.js"
import { DebuggerFormat } from "./format.js"
import { DatastarDebuggerRecorder, type TimelineCommand } from "./recorder.js"
import { debuggerStyles } from "./styles.js"
import type {
  DatastarDebuggerEventEntry,
  DatastarDebuggerFetchEntry,
  DatastarDebuggerState,
  DatastarDebuggerTab
} from "./types.js"

/** Tag name used by the debugger Web Component. */
export const DATASTAR_DEBUGGER_ELEMENT_NAME = "datastar-kit-debugger" as const

const OPEN_ATTRIBUTE = "open"
const MAX_EVENTS_ATTRIBUTE = "max-events"
const MAX_SNAPSHOTS_ATTRIBUTE = "max-snapshots"
const SNAPSHOT_SETTLE_MS = 80
const RESTORE_FALLBACK_MS = 100
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

interface DatastarFetchDetail {
  readonly type?: string
  readonly el?: unknown
  readonly argsRaw?: Readonly<Record<string, unknown>>
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
      <button type="button" data-action="pause" aria-label="Pause debugger" title="Pause">Ⅱ</button>
      <button type="button" data-action="clear-events" aria-label="Clear events" title="Clear events">⌫</button>
      <button type="button" data-action="clear-snapshots" aria-label="Clear snapshots" title="Clear snapshots">⌫</button>
      <button type="button" class="dsk-debug-live" data-action="live" aria-label="Return to live" title="Return to live">●</button>
    </div>
    <section class="dsk-debug-panel" data-panel="signals" role="tabpanel">
      <h3>Signals</h3>
      <pre data-role="signals">{}</pre>
    </section>
    <section class="dsk-debug-panel" data-panel="events" role="tabpanel" hidden>
      <h3>Events</h3>
      <div class="dsk-debug-events" data-role="events"></div>
    </section>
    <section class="dsk-debug-panel" data-panel="timeline" role="tabpanel" hidden>
      <h3>Timeline</h3>
      <div class="dsk-debug-timeline">
        <div class="dsk-slider">
          <input class="dsk-timeline-range" data-role="timeline-range" type="range" min="0" max="0" value="0" aria-label="Timeline position">
          <p class="dsk-debug-timeline-status" data-role="timeline-status">0 snapshots</p>
        </div>
      </div>
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
    private recorder: DatastarDebuggerRecorder | undefined
    private bridge: DatastarDebuggerBridge | undefined
    private readonly cleanup: Array<() => void> = []
    private connected = false
    private snapshotTimer: number | undefined
    private restoreTimer: number | undefined
    private restoreFallbackTimer: number | undefined
    private restoreVersion = 0
    private afterRestore: (() => void) | undefined

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
      this.recorder = new DatastarDebuggerRecorder({
        ...(maxEvents === undefined ? {} : { maxEvents }),
        ...(maxSnapshots === undefined ? {} : { maxSnapshots })
      })
      this.elements.details.open = readOpen(this)

      const sink: DatastarDebuggerBridgeSink = {
        initialise: (signals) => this.handleInitialSignals(signals),
        signalPatch: (patch, signals) => this.handleSignalPatch(patch, signals),
        capture: (label, signals) => this.captureSnapshot(label, signals),
        restored: () => this.finishRestore()
      }
      this.bridge = new DatastarDebuggerBridge(sink)
      this.bridge.connect()
      document.addEventListener("datastar-fetch", this.handleFetchEvent)
      this.cleanup.push(() => document.removeEventListener("datastar-fetch", this.handleFetchEvent))
      this.bindControls()
      this.render()
    }

    private stop(): void {
      if (!this.connected && this.cleanup.length === 0) return
      this.connected = false
      for (const remove of this.cleanup.splice(0)) remove()
      this.clearSnapshotTimer()
      this.clearRestoreTimers()
      this.bridge?.disconnect()
      this.bridge = undefined
      this.recorder = undefined
      this.afterRestore = undefined
    }

    private bindControls(): void {
      for (const button of this.elements.tabButtons) {
        this.listen(button, "click", () => {
          const tab = button.dataset.tab
          if (isDebuggerTab(tab)) {
            this.recorder?.setTab(tab)
            this.render()
          }
        })
      }
      this.listen(this.elements.search, "input", () => {
        this.recorder?.setSearch(this.elements.search.value)
        this.render()
      })
      this.listen(this.elements.pauseButton, "click", () => {
        this.recorder?.togglePaused()
        this.render()
      })
      this.listen(this.elements.clearEventsButton, "click", () => {
        this.recorder?.clearEvents()
        this.render()
      })
      this.listen(this.elements.clearSnapshotsButton, "click", () => {
        if (this.recorder?.clearSnapshots()) this.clearSnapshotTimer()
        this.render()
      })
      this.listen(this.elements.liveButton, "click", () => this.restore(this.recorder?.goLive()))
      this.listen(this.elements.timelineRange, "input", () => {
        this.restore(this.recorder?.selectSnapshot(this.elements.timelineRange.valueAsNumber))
      })
    }

    private listen(target: EventTarget, type: string, listener: EventListener): void {
      target.addEventListener(type, listener)
      this.cleanup.push(() => target.removeEventListener(type, listener))
    }

    private handleInitialSignals(signals: Record<string, unknown>): void {
      this.recorder?.setSignals(signals)
      this.scheduleSnapshot("initial")
      this.render()
    }

    private handleSignalPatch(patch: unknown, signals: Record<string, unknown>): void {
      const recorded = this.recorder?.recordSignalPatch(signals, {
        at: DebuggerFormat.nowLabel(),
        kind: "signal",
        patch: DebuggerFormat.toDebugValue(patch)
      })
      if (recorded) this.scheduleSnapshot("signal patch")
      this.render()
    }

    private readonly handleFetchEvent = (event: Event): void => {
      const detail = readFetchDetail("detail" in event ? event.detail : undefined)
      const type = detail.type ?? "datastar-fetch"
      const argsRaw = detail.argsRaw ?? {}
      const target = DebuggerFormat.patchTarget(type, argsRaw)
      const entry: DatastarDebuggerFetchEntry = {
        at: DebuggerFormat.nowLabel(),
        kind: "fetch",
        type,
        element: DebuggerFormat.toElementLabel(detail.el),
        ...(target ? { target } : {}),
        argsRaw: DebuggerFormat.toDebugRecord(argsRaw),
        ...(type === "started" && this.recorder
          ? { signals: DebuggerFormat.cloneSignals(this.recorder.signals) }
          : {})
      }
      if (this.recorder?.recordFetch(entry) && type === "datastar-patch-elements") {
        this.scheduleSnapshot(type)
      }
      this.render()
    }

    private scheduleSnapshot(label: string): void {
      if (this.snapshotTimer !== undefined || !this.recorder?.isRecording) return
      this.snapshotTimer = window.setTimeout(() => {
        this.snapshotTimer = undefined
        if (!this.recorder?.isRecording) return
        const countBefore = this.recorder.snapshots.length
        const requested = this.bridge?.requestSnapshot(label) ?? false
        if (!requested || this.recorder.snapshots.length === countBefore) {
          this.captureSnapshot(label, DebuggerFormat.cloneSignals(this.recorder.signals))
        }
      }, SNAPSHOT_SETTLE_MS)
    }

    private captureSnapshot(label: string, signals: Record<string, unknown>): void {
      const recorder = this.recorder
      if (!recorder) return
      if (
        recorder.recordSnapshot({
          at: DebuggerFormat.nowLabel(),
          label,
          html: this.captureBodyHtml(),
          signals: DebuggerFormat.cloneSignals(signals)
        })
      ) {
        this.render()
      }
    }

    private captureBodyHtml(): string {
      const clone = document.body.cloneNode(true)
      if (!(clone instanceof HTMLElement)) return ""
      for (const element of Array.from(
        clone.querySelectorAll(
          `${DATASTAR_DEBUGGER_ELEMENT_NAME}, ${DATASTAR_DEBUGGER_BRIDGE_SELECTOR}`
        )
      )) {
        element.remove()
      }
      return clone.innerHTML
    }

    private restore(command: TimelineCommand | undefined): void {
      if (!command || command._tag === "none") return
      this.applySnapshot(
        command.snapshot,
        command.resumeLive
          ? () => {
              this.recorder?.completeLiveRestore()
              this.render()
            }
          : undefined
      )
      this.render()
    }

    private applySnapshot(
      snapshot: { readonly html: string; readonly signals: Readonly<Record<string, unknown>> },
      afterRestore?: () => void
    ): void {
      const bridge = this.bridge
      if (!bridge) return
      const bridgeElement = bridge.connect()
      const { body } = document
      if (this.parentElement !== body) body.appendChild(this)
      if (bridgeElement.parentElement !== body) body.appendChild(bridgeElement)

      for (const child of Array.from(body.children)) {
        if (child !== this && child !== bridgeElement) child.remove()
      }
      this.insertAdjacentHTML("beforebegin", snapshot.html)

      const version = ++this.restoreVersion
      this.clearRestoreTimers()
      this.afterRestore = afterRestore
      this.restoreTimer = window.setTimeout(() => {
        this.restoreTimer = undefined
        if (!this.connected || version !== this.restoreVersion) return
        this.restoreFallbackTimer = window.setTimeout(
          () => this.finishRestore(),
          RESTORE_FALLBACK_MS
        )
        if (!bridge.restore(snapshot.signals)) this.finishRestore()
      })
    }

    private finishRestore(): void {
      if (this.restoreFallbackTimer !== undefined) {
        window.clearTimeout(this.restoreFallbackTimer)
        this.restoreFallbackTimer = undefined
      }
      const afterRestore = this.afterRestore
      this.afterRestore = undefined
      afterRestore?.()
    }

    private render(): void {
      const state = this.recorder?.state()
      if (!state) return
      this.elements.signalCount.textContent = `${Object.keys(state.signals).length} signals`
      this.elements.eventCount.textContent = `${state.events.length} events`
      this.elements.pausedPill.hidden = !state.paused
      this.elements.travelPill.hidden = state.travel._tag === "live"
      this.elements.search.disabled = state.tab === "timeline"
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

    private clearSnapshotTimer(): void {
      if (this.snapshotTimer === undefined) return
      window.clearTimeout(this.snapshotTimer)
      this.snapshotTimer = undefined
    }

    private clearRestoreTimers(): void {
      if (this.restoreTimer !== undefined) window.clearTimeout(this.restoreTimer)
      if (this.restoreFallbackTimer !== undefined) window.clearTimeout(this.restoreFallbackTimer)
      this.restoreTimer = undefined
      this.restoreFallbackTimer = undefined
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

const readFetchDetail = (value: unknown): DatastarFetchDetail => {
  if (!value || typeof value !== "object") return {}
  const type = "type" in value ? value.type : undefined
  const element = "el" in value ? value.el : undefined
  const argsRaw = "argsRaw" in value ? value.argsRaw : undefined
  return {
    ...(typeof type === "string" ? { type } : {}),
    ...("el" in value ? { el: element } : {}),
    ...(argsRaw && typeof argsRaw === "object" && !Array.isArray(argsRaw)
      ? { argsRaw: copyUnknownRecord(argsRaw) }
      : {})
  }
}

const copyUnknownRecord = (value: object): Record<string, unknown> => {
  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) output[key] = item
  return output
}

const timelineStatus = (state: DatastarDebuggerState, index: number): string => {
  const count = state.snapshots.length
  if (count === 0) return "0 snapshots"
  if (state.travel._tag === "live") {
    return `${count} ${count === 1 ? "snapshot" : "snapshots"} · live`
  }
  const snapshot = state.snapshots[index]
  return snapshot ? `${index + 1}/${count} · ${snapshot.at} · ${snapshot.label}` : "no snapshot"
}
