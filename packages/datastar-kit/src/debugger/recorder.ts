import type {
  DatastarDebuggerEventEntry,
  DatastarDebuggerFetchEntry,
  DatastarDebuggerSignalPatchEntry,
  DatastarDebuggerSnapshotEntry,
  DatastarDebuggerState,
  DatastarDebuggerTab
} from "./types.js"

const DEFAULT_MAX_EVENTS = 100
const DEFAULT_MAX_SNAPSHOTS = 50

/** A requested timeline operation. */
export type TimelineCommand =
  | { readonly _tag: "none" }
  | {
      readonly _tag: "restore"
      readonly snapshot: DatastarDebuggerSnapshotEntry
      readonly resumeLive: boolean
    }

/** Holds debugger data independently from the page's Datastar signals. */
export class DatastarDebuggerRecorder {
  private tab: DatastarDebuggerTab = "signals"
  private search = ""
  private paused = false
  private signalsValue: Record<string, unknown> = {}
  private eventsValue: DatastarDebuggerEventEntry[] = []
  private snapshotsValue: DatastarDebuggerSnapshotEntry[] = []
  private travel: DatastarDebuggerState["travel"] = { _tag: "live" }
  private readonly maxEvents: number
  private readonly maxSnapshots: number

  /** Creates a recorder with bounded event and snapshot history. */
  constructor(options: { readonly maxEvents?: number; readonly maxSnapshots?: number } = {}) {
    this.maxEvents = positiveInteger(options.maxEvents, DEFAULT_MAX_EVENTS)
    this.maxSnapshots = positiveInteger(options.maxSnapshots, DEFAULT_MAX_SNAPSHOTS)
  }

  /** Current browser signal values. */
  get signals(): Readonly<Record<string, unknown>> {
    return this.signalsValue
  }

  /** Recorded events in newest-first order. */
  get events(): readonly DatastarDebuggerEventEntry[] {
    return this.eventsValue
  }

  /** Recorded timeline snapshots in oldest-first order. */
  get snapshots(): readonly DatastarDebuggerSnapshotEntry[] {
    return this.snapshotsValue
  }

  /** Whether new events and snapshots may be recorded. */
  get isRecording(): boolean {
    return !this.paused && this.travel._tag === "live"
  }

  /** Selects a debugger tab. */
  setTab(tab: DatastarDebuggerTab): void {
    this.tab = tab
  }

  /** Sets the signal and event search text. */
  setSearch(search: string): void {
    this.search = search
  }

  /** Pauses or resumes recording. */
  togglePaused(): void {
    this.paused = !this.paused
  }

  /** Replaces the current browser signal snapshot. */
  setSignals(signals: Record<string, unknown>): void {
    this.signalsValue = signals
  }

  /** Records a signal patch when recording is active. */
  recordSignalPatch(
    signals: Record<string, unknown>,
    entry: DatastarDebuggerSignalPatchEntry
  ): boolean {
    this.signalsValue = signals
    if (!this.isRecording) return false
    this.rememberEvent(entry)
    return true
  }

  /** Records a fetch event when recording is active. */
  recordFetch(entry: DatastarDebuggerFetchEntry): boolean {
    if (!this.isRecording) return false
    this.rememberEvent(entry)
    return true
  }

  /** Records a timeline snapshot when recording is active. */
  recordSnapshot(snapshot: DatastarDebuggerSnapshotEntry): boolean {
    if (!this.isRecording) return false
    this.signalsValue = copyRecord(snapshot.signals)
    this.snapshotsValue.push(snapshot)
    const excess = this.snapshotsValue.length - this.maxSnapshots
    if (excess > 0) this.snapshotsValue.splice(0, excess)
    return true
  }

  /** Returns the operation needed to display a timeline index. */
  selectSnapshot(index: number): TimelineCommand {
    const latest = this.snapshotsValue.length - 1
    const snapshot = this.snapshotsValue[index]
    if (!snapshot || index < 0 || index > latest) return noTimelineCommand
    if (this.travel._tag === "live" && index === latest) return noTimelineCommand
    if (this.travel._tag === "restored" && this.travel.index === index) return noTimelineCommand

    this.travel = { _tag: "restored", index }
    return { _tag: "restore", snapshot, resumeLive: index === latest }
  }

  /** Returns the operation needed to restore the newest snapshot. */
  goLive(): TimelineCommand {
    if (this.travel._tag === "live") return noTimelineCommand
    const snapshot = this.snapshotsValue[this.snapshotsValue.length - 1]
    if (!snapshot) {
      this.travel = { _tag: "live" }
      return noTimelineCommand
    }
    this.travel = { _tag: "restored", index: this.snapshotsValue.length - 1 }
    return { _tag: "restore", snapshot, resumeLive: true }
  }

  /** Marks a restore of the newest snapshot as complete. */
  completeLiveRestore(): void {
    this.travel = { _tag: "live" }
  }

  /** Clears recorded events. */
  clearEvents(): void {
    this.eventsValue = []
  }

  /** Clears snapshots while the page is live. */
  clearSnapshots(): boolean {
    if (this.travel._tag !== "live") return false
    this.snapshotsValue = []
    return true
  }

  /** Returns the current state used to render the debugger. */
  state(): DatastarDebuggerState {
    return {
      tab: this.tab,
      search: this.search,
      paused: this.paused,
      signals: this.signalsValue,
      events: this.eventsValue,
      snapshots: this.snapshotsValue,
      travel: this.travel
    }
  }

  private rememberEvent(event: DatastarDebuggerEventEntry): void {
    this.eventsValue.unshift(event)
    this.eventsValue.length = Math.min(this.eventsValue.length, this.maxEvents)
  }
}

const noTimelineCommand: TimelineCommand = { _tag: "none" }

const positiveInteger = (value: number | undefined, fallback: number): number =>
  value !== undefined && Number.isInteger(value) && value > 0 ? value : fallback

const copyRecord = (value: Readonly<Record<string, unknown>>): Record<string, unknown> => {
  const output: Record<string, unknown> = {}
  for (const [key, item] of Object.entries(value)) output[key] = item
  return output
}
