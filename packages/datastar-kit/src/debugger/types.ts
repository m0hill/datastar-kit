/** Tab displayed by the debugger. */
export type DatastarDebuggerTab = "signals" | "events" | "timeline"

/** A recorded Datastar signal patch. */
export interface DatastarDebuggerSignalPatchEntry {
  readonly at: string
  readonly kind: "signal"
  readonly patch: unknown
}

/** A recorded Datastar fetch lifecycle event. */
export interface DatastarDebuggerFetchEntry {
  readonly at: string
  readonly kind: "fetch"
  readonly type: string
  readonly element: string
  readonly target?: string
  readonly argsRaw: Readonly<Record<string, unknown>>
  readonly signals?: Readonly<Record<string, unknown>>
}

/** An event shown in the debugger event log. */
export type DatastarDebuggerEventEntry =
  | DatastarDebuggerSignalPatchEntry
  | DatastarDebuggerFetchEntry

/** A page and signal snapshot recorded for time travel. */
export interface DatastarDebuggerSnapshotEntry {
  readonly at: string
  readonly label: string
  readonly html: string
  readonly signals: Readonly<Record<string, unknown>>
}

/** Complete state rendered by the debugger element. */
export interface DatastarDebuggerState {
  readonly tab: DatastarDebuggerTab
  readonly search: string
  readonly paused: boolean
  readonly signals: Readonly<Record<string, unknown>>
  readonly events: readonly DatastarDebuggerEventEntry[]
  readonly snapshots: readonly DatastarDebuggerSnapshotEntry[]
  readonly travel: { readonly _tag: "live" } | { readonly _tag: "restored"; readonly index: number }
}
