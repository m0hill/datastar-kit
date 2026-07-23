import { describe, expect, it } from "vitest"
import { DebuggerFormat } from "../src/debugger/format.js"
import {
  DatastarDebuggerSession,
  type DatastarDebuggerSessionEnvironment,
  type DatastarDebuggerSessionSink
} from "../src/debugger/session.js"

type ScheduledWork = {
  readonly delayMs: number
  readonly task: () => void
  active: boolean
}

class TestDebuggerEnvironment implements DatastarDebuggerSessionEnvironment {
  readonly operations: string[] = []
  readonly restoredIds: number[] = []
  pageHtml = "<main>live</main>"
  signalSnapshot: Record<string, unknown> | undefined
  requestSnapshotResult = true
  restoreResult = true
  disconnected = false
  private sink: DatastarDebuggerSessionSink | undefined
  private readonly scheduled: ScheduledWork[] = []
  private time = 0

  connect(sink: DatastarDebuggerSessionSink): void {
    this.sink = sink
    this.operations.push("connect")
  }

  disconnect(): void {
    this.disconnected = true
    this.sink = undefined
    this.operations.push("disconnect")
  }

  nowLabel(): string {
    this.time += 1
    return `time-${this.time}`
  }

  schedule(delayMs: number, task: () => void): () => void {
    const work: ScheduledWork = { delayMs, task, active: true }
    this.scheduled.push(work)
    return () => {
      work.active = false
    }
  }

  capturePageHtml(): string {
    return this.pageHtml
  }

  requestSignalSnapshot(label: string): boolean {
    this.operations.push(`request:${label}`)
    if (this.signalSnapshot !== undefined) this.sink?.capture(label, this.signalSnapshot)
    return this.requestSnapshotResult
  }

  replacePageHtml(html: string): boolean {
    this.operations.push(`replace:${html}`)
    return true
  }

  restoreSignals(_signals: Readonly<Record<string, unknown>>, restoreId: number): boolean {
    this.operations.push(`restore:${restoreId}`)
    this.restoredIds.push(restoreId)
    return this.restoreResult
  }

  flushNext(delayMs: number): void {
    const work = this.scheduled.find(
      (candidate) => candidate.active && candidate.delayMs === delayMs
    )
    if (work === undefined) throw new Error(`No scheduled debugger work after ${delayMs}ms`)
    work.active = false
    work.task()
  }

  completeRestore(restoreId: number): void {
    this.sink?.restored(restoreId)
  }

  activeDelays(): number[] {
    return this.scheduled.filter((work) => work.active).map((work) => work.delayMs)
  }
}

const capture = (
  session: DatastarDebuggerSession,
  label: string,
  signals: Record<string, unknown> = { label }
): void => {
  session.send({ _tag: "capture", label, signals })
}

const patch = (session: DatastarDebuggerSession, count: number): void => {
  session.send({ _tag: "signalPatch", patch: { count }, signals: { count } })
}

describe("Datastar debugger", () => {
  it("owns bounded recording and travel policy behind the session interface", () => {
    const environment = new TestDebuggerEnvironment()
    const session = new DatastarDebuggerSession({
      environment,
      maxEvents: 2,
      maxSnapshots: 2
    })
    session.start()

    patch(session, 1)
    patch(session, 2)
    patch(session, 3)
    capture(session, "one")
    capture(session, "two")
    capture(session, "three")

    expect(session.state().events.map((event) => event.at)).toEqual(["time-3", "time-2"])
    expect(session.state().snapshots.map((entry) => entry.label)).toEqual(["two", "three"])

    session.send({ _tag: "togglePaused" })
    patch(session, 4)
    expect(session.state().signals).toEqual({ count: 4 })
    expect(session.state().events).toHaveLength(2)
    session.send({ _tag: "togglePaused" })

    session.send({ _tag: "selectSnapshot", index: 0 })
    expect(session.state().travel).toEqual({ _tag: "restored", index: 0 })
    patch(session, 5)
    expect(session.state().signals).toEqual({ count: 5 })
    expect(session.state().events).toHaveLength(2)
    expect(session.send({ _tag: "clearSnapshots" }).snapshots).toHaveLength(2)

    session.send({ _tag: "goLive" })
    environment.flushNext(0)
    const restoreId = environment.restoredIds[0]
    if (restoreId === undefined) throw new Error("Expected a live restore request")
    environment.completeRestore(restoreId)

    expect(session.state().travel).toEqual({ _tag: "live" })
    expect(session.send({ _tag: "clearSnapshots" }).snapshots).toEqual([])
  })

  it("coalesces snapshot requests and falls back when the bridge does not capture", () => {
    const environment = new TestDebuggerEnvironment()
    const session = new DatastarDebuggerSession({ environment })
    session.start()

    session.send({ _tag: "initialise", signals: { count: 0 } })
    patch(session, 1)
    expect(environment.activeDelays()).toEqual([80])

    environment.signalSnapshot = { count: 1 }
    environment.flushNext(80)
    expect(session.state().snapshots).toMatchObject([
      { label: "initial", html: "<main>live</main>", signals: { count: 1 } }
    ])

    environment.signalSnapshot = undefined
    patch(session, 2)
    patch(session, 3)
    expect(environment.activeDelays()).toEqual([80])
    environment.flushNext(80)

    expect(session.state().snapshots).toMatchObject([
      { label: "initial", signals: { count: 1 } },
      { label: "signal patch", signals: { count: 3 } }
    ])
  })

  it("recognizes bridge capture even when bounded history length stays unchanged", () => {
    const environment = new TestDebuggerEnvironment()
    const session = new DatastarDebuggerSession({ environment, maxSnapshots: 1 })
    session.start()

    environment.signalSnapshot = { count: 1 }
    patch(session, 1)
    environment.flushNext(80)

    environment.signalSnapshot = { count: 42 }
    patch(session, 2)
    environment.flushNext(80)

    expect(session.state().snapshots).toMatchObject([
      { label: "signal patch", signals: { count: 42 } }
    ])
  })

  it("orders page and signal restoration while ignoring stale completion callbacks", () => {
    const environment = new TestDebuggerEnvironment()
    const session = new DatastarDebuggerSession({ environment })
    session.start()
    for (const label of ["one", "two", "three"]) {
      environment.pageHtml = `<main>${label}</main>`
      capture(session, label)
    }

    session.send({ _tag: "selectSnapshot", index: 0 })
    environment.flushNext(0)
    const firstRestore = environment.restoredIds[0]
    if (firstRestore === undefined) throw new Error("Expected the first restore request")

    session.send({ _tag: "selectSnapshot", index: 1 })
    environment.flushNext(0)
    const secondRestore = environment.restoredIds[1]
    if (secondRestore === undefined) throw new Error("Expected the second restore request")
    environment.completeRestore(firstRestore)
    expect(session.state().travel).toEqual({ _tag: "restored", index: 1 })

    session.send({ _tag: "goLive" })
    environment.flushNext(0)
    const liveRestore = environment.restoredIds[2]
    if (liveRestore === undefined) throw new Error("Expected the live restore request")
    environment.completeRestore(secondRestore)
    expect(session.state().travel).toEqual({ _tag: "restored", index: 2 })
    environment.completeRestore(liveRestore)

    expect(session.state().travel).toEqual({ _tag: "live" })
    expect(
      environment.operations.filter(
        (operation) => operation.startsWith("replace:") || operation.startsWith("restore:")
      )
    ).toEqual([
      "replace:<main>one</main>",
      `restore:${firstRestore}`,
      "replace:<main>two</main>",
      `restore:${secondRestore}`,
      "replace:<main>three</main>",
      `restore:${liveRestore}`
    ])
  })

  it("uses restore completion fallbacks without resuming recording too early", () => {
    const environment = new TestDebuggerEnvironment()
    const session = new DatastarDebuggerSession({ environment })
    session.start()
    capture(session, "old")
    capture(session, "new")

    session.send({ _tag: "selectSnapshot", index: 0 })
    environment.flushNext(0)
    environment.flushNext(100)
    expect(session.state().travel).toEqual({ _tag: "restored", index: 0 })

    session.send({ _tag: "goLive" })
    environment.flushNext(0)
    expect(session.state().travel).toEqual({ _tag: "restored", index: 1 })
    environment.flushNext(100)

    expect(session.state().travel).toEqual({ _tag: "live" })
  })

  it("cancels scheduled lifecycle work when disposed", () => {
    const environment = new TestDebuggerEnvironment()
    const session = new DatastarDebuggerSession({ environment })
    session.start()
    session.send({ _tag: "initialise", signals: { count: 0 } })

    expect(environment.activeDelays()).toEqual([80])
    session.dispose()

    expect(environment.activeDelays()).toEqual([])
    expect(environment.disconnected).toBe(true)
    expect(session.state().snapshots).toEqual([])
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
