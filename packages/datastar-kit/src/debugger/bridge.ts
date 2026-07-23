const BRIDGE_ID = "datastar-kit-debugger-bridge"
const GLOBAL_NAME = "__datastarKitDebugger"
const SNAPSHOT_EVENT = "datastar-kit-debugger-snapshot"
const RESTORE_EVENT = "datastar-kit-debugger-restore"

/** Receives signal activity from the hidden Datastar bridge. */
export interface DatastarDebuggerBridgeSink {
  readonly initialise: (signals: Record<string, unknown>) => void
  readonly signalPatch: (patch: unknown, signals: Record<string, unknown>) => void
  readonly capture: (label: string, signals: Record<string, unknown>) => void
  readonly restored: () => void
}

declare global {
  interface Window {
    __datastarKitDebugger?: DatastarDebuggerBridgeSink
  }
}

const signalSnapshotExpression = `(() => {
  const snapshot = {}
  for (const key of Object.keys($)) {
    try {
      snapshot[key] = JSON.parse(JSON.stringify($[key]))
    } catch {
      // Signals that cannot round-trip through JSON cannot be restored.
    }
  }
  return snapshot
})()`

const signalRestoreExpression = `(() => {
  const signals = evt.detail?.signals || {}
  for (const key of Object.keys($)) {
    if (!Object.hasOwn(signals, key)) {
      try { delete $[key] } catch {}
    }
  }
  for (const [key, value] of Object.entries(signals)) {
    try { $[key] = value } catch {}
  }
  window.${GLOBAL_NAME}?.restored()
})()`

/** Connects browser code to Datastar's signal scope through a hidden element. */
export class DatastarDebuggerBridge {
  private bridgeElement: HTMLElement | undefined

  /** Creates a bridge for one connected debugger element. */
  constructor(private readonly sink: DatastarDebuggerBridgeSink) {}

  /** Adds the bridge to the current document. */
  connect(): HTMLElement {
    window.__datastarKitDebugger = this.sink
    const bridge = this.bridgeElement ?? document.createElement("div")
    bridge.id = BRIDGE_ID
    bridge.hidden = true
    bridge.style.display = "none"
    bridge.setAttribute("data-datastar-kit-debugger-bridge", "")
    bridge.setAttribute(
      "data-init",
      `window.${GLOBAL_NAME}?.initialise(${signalSnapshotExpression})`
    )
    bridge.setAttribute(
      "data-on-signal-patch",
      `window.${GLOBAL_NAME}?.signalPatch(patch, ${signalSnapshotExpression})`
    )
    bridge.setAttribute(
      `data-on:${SNAPSHOT_EVENT}`,
      `window.${GLOBAL_NAME}?.capture(evt.detail?.label || "snapshot", ${signalSnapshotExpression})`
    )
    bridge.setAttribute(`data-on:${RESTORE_EVENT}`, signalRestoreExpression)
    this.bridgeElement = bridge
    if (!bridge.isConnected) document.body.appendChild(bridge)
    return bridge
  }

  /** Requests a current signal snapshot from Datastar. */
  requestSnapshot(label: string): boolean {
    const bridge = this.bridgeElement
    if (!bridge?.isConnected) return false
    bridge.dispatchEvent(new CustomEvent(SNAPSHOT_EVENT, { detail: { label } }))
    return true
  }

  /** Restores a signal snapshot through Datastar. */
  restore(signals: Readonly<Record<string, unknown>>): boolean {
    const bridge = this.bridgeElement
    if (!bridge?.isConnected) return false
    bridge.dispatchEvent(new CustomEvent(RESTORE_EVENT, { detail: { signals } }))
    return true
  }

  /** Returns the bridge element retained during page snapshot restoration. */
  element(): HTMLElement | undefined {
    return this.bridgeElement
  }

  /** Removes the bridge and its global callback. */
  disconnect(): void {
    this.bridgeElement?.remove()
    this.bridgeElement = undefined
    if (window.__datastarKitDebugger === this.sink) delete window.__datastarKitDebugger
  }
}

/** Attribute used to identify the bridge in captured page HTML. */
export const DATASTAR_DEBUGGER_BRIDGE_SELECTOR = `#${BRIDGE_ID}, [data-datastar-kit-debugger-bridge]`
