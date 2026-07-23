import { describe, expect, it } from "vitest"
import { DebuggerFormat } from "../src/debugger/format.js"
import { DatastarDebuggerRecorder } from "../src/debugger/recorder.js"

const signalEvent = (at: string) => ({ at, kind: "signal" as const, patch: { at } })
const snapshot = (label: string) => ({
  at: label,
  label,
  html: `<main>${label}</main>`,
  signals: { label }
})

describe("Datastar debugger", () => {
  it("bounds recorded history and stops recording during time travel", () => {
    const recorder = new DatastarDebuggerRecorder({ maxEvents: 2, maxSnapshots: 2 })
    recorder.recordSignalPatch({}, signalEvent("1"))
    recorder.recordSignalPatch({}, signalEvent("2"))
    recorder.recordSignalPatch({}, signalEvent("3"))
    recorder.recordSnapshot(snapshot("one"))
    recorder.recordSnapshot(snapshot("two"))
    recorder.recordSnapshot(snapshot("three"))

    expect(recorder.events.map((event) => event.at)).toEqual(["3", "2"])
    expect(recorder.snapshots.map((entry) => entry.label)).toEqual(["two", "three"])

    expect(recorder.selectSnapshot(0)).toMatchObject({
      _tag: "restore",
      snapshot: { label: "two" },
      resumeLive: false
    })
    expect(recorder.isRecording).toBe(false)
    expect(recorder.recordSignalPatch({}, signalEvent("4"))).toBe(false)
    expect(recorder.clearSnapshots()).toBe(false)

    expect(recorder.goLive()).toMatchObject({
      _tag: "restore",
      snapshot: { label: "three" },
      resumeLive: true
    })
    recorder.completeLiveRestore()
    expect(recorder.isRecording).toBe(true)
    expect(recorder.clearSnapshots()).toBe(true)
  })

  it("pauses recording without losing the latest signal values", () => {
    const recorder = new DatastarDebuggerRecorder()
    recorder.togglePaused()

    expect(recorder.recordSignalPatch({ count: 2 }, signalEvent("1"))).toBe(false)
    expect(recorder.signals).toEqual({ count: 2 })
    expect(recorder.events).toEqual([])
  })

  it("normalizes values that cannot be represented as JSON", () => {
    const circular: Record<string, unknown> = {}
    circular.self = circular

    expect(DebuggerFormat.toDebugValue(circular)).toEqual({ self: "[Circular]" })
    const shared = { value: 1 }
    expect(DebuggerFormat.toDebugValue({ first: shared, second: shared })).toEqual({
      first: { value: 1 },
      second: { value: 1 }
    })
    expect(DebuggerFormat.toDebugValue(12n)).toBe("12n")
    expect(DebuggerFormat.toDebugValue(() => undefined)).toBe("[Function]")
  })

  it("supports text, regular-expression, and invalid searches", () => {
    expect(DebuggerFormat.createMatcher("ada")("Ada Lovelace")).toBe(true)
    expect(DebuggerFormat.createMatcher("/^Ada/")("Ada Lovelace")).toBe(true)
    expect(DebuggerFormat.createMatcher("/[invalid/")("anything")).toBe(false)
  })
})
