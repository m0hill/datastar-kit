import { DebuggerFormat } from "./format.js"
import { DatastarDebuggerRecorder, type TimelineCommand } from "./recorder.js"
import type { DatastarDebuggerState, DatastarDebuggerTab } from "./types.js"

const SNAPSHOT_SETTLE_MS = 80
const RESTORE_FALLBACK_MS = 100

/** Parsed browser fetch activity accepted by a debugger session. */
export interface DatastarDebuggerFetchInput {
  /** Datastar fetch lifecycle event type. */
  readonly type?: string
  /** Element that originated the fetch activity. */
  readonly element?: unknown
  /** Raw Datastar fetch arguments. */
  readonly argsRaw?: Readonly<Record<string, unknown>>
}

/** Browser callbacks delivered to a connected debugger session. */
export interface DatastarDebuggerSessionSink {
  /** Supplies the initial signal state. */
  readonly initialise: (signals: Record<string, unknown>) => void
  /** Supplies one signal patch and the resulting complete signal state. */
  readonly signalPatch: (patch: unknown, signals: Record<string, unknown>) => void
  /** Supplies a requested signal snapshot. */
  readonly capture: (label: string, signals: Record<string, unknown>) => void
  /** Confirms that a requested signal restore completed. */
  readonly restored: (restoreId: number | undefined) => void
  /** Supplies parsed Datastar fetch activity. */
  readonly fetch: (input: DatastarDebuggerFetchInput) => void
}

/** Browser capabilities required by the debugger session lifecycle. */
export interface DatastarDebuggerSessionEnvironment {
  /** Connects browser event and signal callbacks. */
  connect(sink: DatastarDebuggerSessionSink): void
  /** Disconnects browser callbacks and bridge state. */
  disconnect(): void
  /** Returns a display timestamp for a newly recorded entry. */
  nowLabel(): string
  /** Schedules work and returns an idempotent cancellation function. */
  schedule(delayMs: number, task: () => void): () => void
  /** Captures the current page HTML without debugger infrastructure. */
  capturePageHtml(): string
  /** Requests a current signal snapshot through the Datastar bridge. */
  requestSignalSnapshot(label: string): boolean
  /** Replaces page content while retaining debugger infrastructure. */
  replacePageHtml(html: string): boolean
  /** Requests signal restoration and associates completion with a restore generation. */
  restoreSignals(signals: Readonly<Record<string, unknown>>, restoreId: number): boolean
}

/** User and browser intents accepted by a debugger session. */
export type DatastarDebuggerSessionIntent =
  | { readonly _tag: "setTab"; readonly tab: DatastarDebuggerTab }
  | { readonly _tag: "setSearch"; readonly search: string }
  | { readonly _tag: "togglePaused" }
  | { readonly _tag: "clearEvents" }
  | { readonly _tag: "clearSnapshots" }
  | { readonly _tag: "selectSnapshot"; readonly index: number }
  | { readonly _tag: "goLive" }
  | { readonly _tag: "initialise"; readonly signals: Record<string, unknown> }
  | {
      readonly _tag: "signalPatch"
      readonly patch: unknown
      readonly signals: Record<string, unknown>
    }
  | { readonly _tag: "fetch"; readonly input: DatastarDebuggerFetchInput }
  | {
      readonly _tag: "capture"
      readonly label: string
      readonly signals: Record<string, unknown>
    }
  | { readonly _tag: "restoreCompleted"; readonly restoreId: number | undefined }

/** Configuration for one debugger session. */
export interface DatastarDebuggerSessionOptions {
  /** Concrete browser or test environment used for lifecycle effects. */
  readonly environment: DatastarDebuggerSessionEnvironment
  /** Maximum retained event entries. */
  readonly maxEvents?: number
  /** Maximum retained timeline snapshots. */
  readonly maxSnapshots?: number
  /** Called whenever caller-visible session state changes. */
  readonly onStateChange?: (state: DatastarDebuggerState) => void
}

type PendingRestore = {
  readonly id: number
  readonly resumeLive: boolean
}

/**
 * Owns debugger recording, snapshot scheduling, restoration ordering, and lifecycle cleanup.
 *
 * Browser elements send intents and render {@link state}; browser-specific mechanics are supplied
 * by a {@link DatastarDebuggerSessionEnvironment} adapter.
 */
export class DatastarDebuggerSession {
  private readonly recorder: DatastarDebuggerRecorder
  private readonly environment: DatastarDebuggerSessionEnvironment
  private readonly onStateChange: ((state: DatastarDebuggerState) => void) | undefined
  private started = false
  private disposed = false
  private snapshotCancellation: (() => void) | undefined
  private snapshotVersion = 0
  private restoreCancellation: (() => void) | undefined
  private restoreFallbackCancellation: (() => void) | undefined
  private restoreVersion = 0
  private pendingRestore: PendingRestore | undefined

  /** Creates a disconnected debugger session. */
  constructor(options: DatastarDebuggerSessionOptions) {
    this.environment = options.environment
    this.onStateChange = options.onStateChange
    this.recorder = new DatastarDebuggerRecorder({
      ...(options.maxEvents === undefined ? {} : { maxEvents: options.maxEvents }),
      ...(options.maxSnapshots === undefined ? {} : { maxSnapshots: options.maxSnapshots })
    })
  }

  /** Connects the environment once and returns the initial render state. */
  start(): DatastarDebuggerState {
    if (this.started || this.disposed) return this.state()
    this.started = true
    this.environment.connect({
      initialise: (signals) => this.send({ _tag: "initialise", signals }),
      signalPatch: (patch, signals) => this.send({ _tag: "signalPatch", patch, signals }),
      capture: (label, signals) => this.send({ _tag: "capture", label, signals }),
      restored: (restoreId) => this.send({ _tag: "restoreCompleted", restoreId }),
      fetch: (input) => this.send({ _tag: "fetch", input })
    })
    return this.state()
  }

  /** Applies one user or browser intent and returns the resulting render state. */
  send(intent: DatastarDebuggerSessionIntent): DatastarDebuggerState {
    if (!this.started || this.disposed) return this.state()

    let changed = false
    switch (intent._tag) {
      case "setTab":
        this.recorder.setTab(intent.tab)
        changed = true
        break
      case "setSearch":
        this.recorder.setSearch(intent.search)
        changed = true
        break
      case "togglePaused":
        this.recorder.togglePaused()
        if (!this.recorder.isRecording) this.cancelSnapshot()
        changed = true
        break
      case "clearEvents":
        this.recorder.clearEvents()
        changed = true
        break
      case "clearSnapshots":
        changed = this.recorder.clearSnapshots()
        if (changed) this.cancelSnapshot()
        break
      case "selectSnapshot":
        changed = this.restore(this.recorder.selectSnapshot(intent.index))
        break
      case "goLive":
        changed = this.restore(this.recorder.goLive())
        break
      case "initialise":
        this.recorder.setSignals(intent.signals)
        this.scheduleSnapshot("initial")
        changed = true
        break
      case "signalPatch":
        changed = this.recordSignalPatch(intent.patch, intent.signals)
        break
      case "fetch":
        changed = this.recordFetch(intent.input)
        break
      case "capture":
        changed = this.captureSnapshot(intent.label, intent.signals)
        break
      case "restoreCompleted":
        changed = this.finishRestore(intent.restoreId ?? this.pendingRestore?.id)
        break
    }

    if (changed) this.emitState()
    return this.state()
  }

  /** Returns the complete state rendered by the debugger element. */
  state(): DatastarDebuggerState {
    return this.recorder.state()
  }

  /** Cancels pending work and disconnects the environment. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.started = false
    this.cancelSnapshot()
    this.cancelRestore()
    this.pendingRestore = undefined
    this.restoreVersion += 1
    this.environment.disconnect()
  }

  private recordSignalPatch(patch: unknown, signals: Record<string, unknown>): boolean {
    const recorded = this.recorder.recordSignalPatch(signals, {
      at: this.environment.nowLabel(),
      kind: "signal",
      patch: DebuggerFormat.toDebugValue(patch)
    })
    if (recorded) this.scheduleSnapshot("signal patch")
    return true
  }

  private recordFetch(input: DatastarDebuggerFetchInput): boolean {
    const type = input.type ?? "datastar-fetch"
    const argsRaw = input.argsRaw ?? {}
    const target = DebuggerFormat.patchTarget(type, argsRaw)
    const recorded = this.recorder.recordFetch({
      at: this.environment.nowLabel(),
      kind: "fetch",
      type,
      element: DebuggerFormat.toElementLabel(input.element),
      ...(target ? { target } : {}),
      argsRaw: DebuggerFormat.toDebugRecord(argsRaw),
      ...(type === "started" ? { signals: DebuggerFormat.cloneSignals(this.recorder.signals) } : {})
    })
    if (recorded && type === "datastar-patch-elements") this.scheduleSnapshot(type)
    return recorded
  }

  private scheduleSnapshot(label: string): void {
    if (this.snapshotCancellation !== undefined || !this.recorder.isRecording) return
    this.snapshotCancellation = this.environment.schedule(SNAPSHOT_SETTLE_MS, () => {
      this.snapshotCancellation = undefined
      if (this.disposed || !this.recorder.isRecording) return

      const versionBefore = this.snapshotVersion
      const requested = this.environment.requestSignalSnapshot(label)
      if (!requested || this.snapshotVersion === versionBefore) {
        if (this.captureSnapshot(label, DebuggerFormat.cloneSignals(this.recorder.signals))) {
          this.emitState()
        }
      }
    })
  }

  private captureSnapshot(label: string, signals: Record<string, unknown>): boolean {
    const recorded = this.recorder.recordSnapshot({
      at: this.environment.nowLabel(),
      label,
      html: this.environment.capturePageHtml(),
      signals: DebuggerFormat.cloneSignals(signals)
    })
    if (recorded) this.snapshotVersion += 1
    return recorded
  }

  private restore(command: TimelineCommand): boolean {
    if (command._tag === "none") return false
    this.cancelSnapshot()
    this.beginRestore(command.snapshot.html, command.snapshot.signals, command.resumeLive)
    return true
  }

  private beginRestore(
    html: string,
    signals: Readonly<Record<string, unknown>>,
    resumeLive: boolean
  ): void {
    this.cancelRestore()
    const id = ++this.restoreVersion
    this.pendingRestore = { id, resumeLive }

    if (!this.environment.replacePageHtml(html)) {
      this.finishRestore(id)
      return
    }

    this.restoreCancellation = this.environment.schedule(0, () => {
      this.restoreCancellation = undefined
      if (!this.isCurrentRestore(id)) return

      this.restoreFallbackCancellation = this.environment.schedule(RESTORE_FALLBACK_MS, () => {
        this.restoreFallbackCancellation = undefined
        if (this.finishRestore(id)) this.emitState()
      })
      if (!this.environment.restoreSignals(signals, id)) {
        if (this.finishRestore(id)) this.emitState()
      }
    })
  }

  private finishRestore(id: number | undefined): boolean {
    if (id === undefined || !this.isCurrentRestore(id)) return false
    const resumeLive = this.pendingRestore?.resumeLive === true
    this.cancelRestore()
    this.pendingRestore = undefined
    if (resumeLive) this.recorder.completeLiveRestore()
    return resumeLive
  }

  private isCurrentRestore(id: number): boolean {
    return !this.disposed && this.pendingRestore?.id === id
  }

  private cancelSnapshot(): void {
    this.snapshotCancellation?.()
    this.snapshotCancellation = undefined
  }

  private cancelRestore(): void {
    this.restoreCancellation?.()
    this.restoreFallbackCancellation?.()
    this.restoreCancellation = undefined
    this.restoreFallbackCancellation = undefined
  }

  private emitState(): void {
    this.onStateChange?.(this.state())
  }
}
