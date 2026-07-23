import {
  DATASTAR_DEBUGGER_BRIDGE_SELECTOR,
  DatastarDebuggerBridge,
  type DatastarDebuggerBridgeSink
} from "./bridge.js"
import { DebuggerFormat } from "./format.js"
import type {
  DatastarDebuggerFetchInput,
  DatastarDebuggerSessionEnvironment,
  DatastarDebuggerSessionSink
} from "./session.js"

/** Browser adapter for debugger bridge, document, clock, and timer capabilities. */
export class DatastarDebuggerBrowserEnvironment implements DatastarDebuggerSessionEnvironment {
  private bridge: DatastarDebuggerBridge | undefined
  private fetchListener: EventListener | undefined

  /** Creates an environment that preserves one debugger element during page restoration. */
  constructor(private readonly owner: HTMLElement) {}

  /** Connects the hidden Datastar bridge and document fetch listener. */
  connect(sink: DatastarDebuggerSessionSink): void {
    if (this.bridge !== undefined) return

    const bridgeSink: DatastarDebuggerBridgeSink = {
      initialise: sink.initialise,
      signalPatch: sink.signalPatch,
      capture: sink.capture,
      restored: sink.restored
    }
    this.bridge = new DatastarDebuggerBridge(bridgeSink)
    this.bridge.connect()

    this.fetchListener = (event: Event): void => {
      sink.fetch(readFetchInput("detail" in event ? event.detail : undefined))
    }
    document.addEventListener("datastar-fetch", this.fetchListener)
  }

  /** Disconnects bridge and document callbacks. */
  disconnect(): void {
    if (this.fetchListener !== undefined) {
      document.removeEventListener("datastar-fetch", this.fetchListener)
      this.fetchListener = undefined
    }
    this.bridge?.disconnect()
    this.bridge = undefined
  }

  /** Returns the current localized browser time. */
  nowLabel(): string {
    return DebuggerFormat.nowLabel()
  }

  /** Schedules cancellable browser work. */
  schedule(delayMs: number, task: () => void): () => void {
    let active = true
    const timer = window.setTimeout(() => {
      if (!active) return
      active = false
      task()
    }, delayMs)

    return () => {
      if (!active) return
      active = false
      window.clearTimeout(timer)
    }
  }

  /** Captures body HTML without debugger infrastructure. */
  capturePageHtml(): string {
    const clone = document.body?.cloneNode(true)
    if (!(clone instanceof HTMLElement)) return ""

    const ownerSelector = this.owner.tagName.toLowerCase()
    for (const element of Array.from(
      clone.querySelectorAll(`${ownerSelector}, ${DATASTAR_DEBUGGER_BRIDGE_SELECTOR}`)
    )) {
      element.remove()
    }
    return clone.innerHTML
  }

  /** Requests a signal snapshot from the connected Datastar bridge. */
  requestSignalSnapshot(label: string): boolean {
    return this.bridge?.requestSnapshot(label) ?? false
  }

  /** Replaces body content while retaining the debugger and bridge elements. */
  replacePageHtml(html: string): boolean {
    const bridge = this.bridge
    const { body } = document
    if (!bridge || !body) return false

    const bridgeElement = bridge.connect()
    if (this.owner.parentElement !== body) body.appendChild(this.owner)
    if (bridgeElement.parentElement !== body) body.appendChild(bridgeElement)

    for (const child of Array.from(body.children)) {
      if (child !== this.owner && child !== bridgeElement) child.remove()
    }
    this.owner.insertAdjacentHTML("beforebegin", html)
    return true
  }

  /** Requests signal restoration through the connected Datastar bridge. */
  restoreSignals(signals: Readonly<Record<string, unknown>>, restoreId: number): boolean {
    return this.bridge?.restore(signals, restoreId) ?? false
  }
}

const readFetchInput = (value: unknown): DatastarDebuggerFetchInput => {
  if (!value || typeof value !== "object") return {}
  const type = "type" in value ? value.type : undefined
  const element = "el" in value ? value.el : undefined
  const argsRaw = "argsRaw" in value ? value.argsRaw : undefined
  return {
    ...(typeof type === "string" ? { type } : {}),
    ...(element === undefined ? {} : { element }),
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
