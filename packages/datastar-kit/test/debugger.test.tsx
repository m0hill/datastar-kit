import { Script, runInNewContext } from "node:vm"
import { describe, expect, it } from "vitest"
import { renderToString } from "../src/html.js"
import {
  DATASTAR_DEBUGGER_STATE_NAME,
  DatastarDebugger,
  type DatastarDebuggerStateName,
  datastarDebuggerDefaults
} from "../src/debugger.js"

const DEFAULT_SIGNAL_REF = `$${DATASTAR_DEBUGGER_STATE_NAME}`

type RuntimeDebuggerEvent = Record<string, unknown>
type RuntimeDebuggerSnapshot = {
  at: string
  label: string
  html: string
  signals: Record<string, unknown>
}
type RuntimeDebuggerState = {
  tab: "signals" | "events" | "timeline"
  search: string
  paused: boolean
  events: RuntimeDebuggerEvent[]
  snapshots: RuntimeDebuggerSnapshot[]
  travel: { index: number; active: boolean; pending: boolean }
}

const decodeHtmlAttribute = (value: string): string =>
  value
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const attributeValues = (html: string, attribute: string): string[] =>
  Array.from(
    html.matchAll(new RegExp(`${escapeRegExp(attribute)}="([\\s\\S]*?)"`, "g")),
    ([, value]) => decodeHtmlAttribute(value ?? "")
  )

const attributeValue = (html: string, attribute: string): string => {
  const values = attributeValues(html, attribute)
  expect(values).toHaveLength(1)
  return values[0]!
}

const runtimeDebuggerState = (): RuntimeDebuggerState => ({
  ...datastarDebuggerDefaults(),
  events: [],
  snapshots: [],
  travel: { index: -1, active: false, pending: false }
})

type FakeBodyChild = {
  removed: boolean
  remove: () => void
}

const makeFakeDom = (bodyHtml = "<main>live</main>") => {
  const inserted: string[] = []
  const root: Record<string, unknown> = {
    insertAdjacentHTML: (_position: string, html: string) => {
      inserted.push(html)
    }
  }
  const otherChild: FakeBodyChild = {
    removed: false,
    remove() {
      this.removed = true
    }
  }
  const body = {
    children: [otherChild, root],
    appendChild: (node: Record<string, unknown>) => {
      node.parentElement = body
    },
    cloneNode: () => ({
      querySelector: (selector: string) =>
        selector === "#datastar-kit-debugger" ? { remove: () => {} } : null,
      innerHTML: bodyHtml
    }),
    insertAdjacentHTML: (_position: string, html: string) => {
      inserted.push(html)
    }
  }
  root.parentElement = body
  return {
    document: {
      body,
      getElementById: (id: string) => (id === "datastar-kit-debugger" ? root : null)
    },
    inserted,
    otherChild
  }
}

const runtimeScope = (bodyHtml?: string) => {
  const timers: Array<() => void> = []
  const dom = makeFakeDom(bodyHtml)
  return {
    ...dom,
    timers,
    flushTimers: () => {
      for (const timer of timers.splice(0)) timer()
    },
    scope: {
      document: dom.document,
      CSS: { escape: (value: string) => value },
      setTimeout: (callback: () => void) => {
        timers.push(callback)
        return timers.length
      }
    }
  }
}

const runExpression = (expression: string, scope: Readonly<Record<string, unknown>>): unknown =>
  runInNewContext(expression, { ...scope })

describe("Datastar debugger", () => {
  it("renders Datastar wiring with local signal state", () => {
    const html = renderToString(
      <DatastarDebugger
        open={false}
        class="outer"
        className="extra"
        style="color:red"
      />
    )

    expect(html).toContain('id="datastar-kit-debugger"')
    expect(html).toContain('class="datastar-kit-debugger outer extra"')
    expect(html).toContain('style="color:red"')
    expect(html).toContain("<details>")
    expect(html).not.toContain("<details open")

    expect(JSON.parse(attributeValue(html, "data-signals__ifmissing"))).toEqual({
      [DATASTAR_DEBUGGER_STATE_NAME]: datastarDebuggerDefaults()
    })
    expect(attributeValue(html, "data-on-signal-patch-filter")).toBe(
      `{exclude: /^${DATASTAR_DEBUGGER_STATE_NAME}(\\.|$)/}`
    )
    expect(attributeValues(html, "data-on:datastar-fetch")).toHaveLength(1)
    expect(attributeValues(html, "data-on:datastar-fetch__document")).toEqual([])
    expect(attributeValues(html, "data-init")).toHaveLength(1)
    expect(attributeValue(html, "data-bind")).toBe(`${DATASTAR_DEBUGGER_STATE_NAME}.search`)
    expect(attributeValues(html, "data-effect")).toHaveLength(3)
    expect(attributeValues(html, "data-on:input__debounce.100ms")).toHaveLength(1)
    expect(attributeValues(html, "data-attr:aria-selected")).toEqual([
      `${DEFAULT_SIGNAL_REF}.tab === "signals"`,
      `${DEFAULT_SIGNAL_REF}.tab === "events"`,
      `${DEFAULT_SIGNAL_REF}.tab === "timeline"`
    ])
    expect(attributeValues(html, "data-attr:aria-pressed")).toEqual([
      `${DEFAULT_SIGNAL_REF}.paused`
    ])
    const textExpressions = attributeValues(html, "data-text")
    expect(textExpressions).toHaveLength(3)
    expect(textExpressions[0]).toBe(
      `Object.keys($).filter((key) => key !== ${JSON.stringify(
        DATASTAR_DEBUGGER_STATE_NAME
      )}).length + " signals"`
    )
    expect(textExpressions[1]).toBe(`${DEFAULT_SIGNAL_REF}.events.length + " events"`)
    expect(textExpressions[2]).toContain("snapshots")
  })

  it("emits parseable Datastar expressions", () => {
    const html = renderToString(<DatastarDebugger />)

    for (const attribute of [
      "data-effect",
      "data-init",
      "data-text",
      "data-show",
      "data-on:click",
      "data-on:input__debounce.100ms",
      "data-on-signal-patch",
      "data-on:datastar-fetch",
      "data-attr:aria-label",
      "data-attr:aria-pressed",
      "data-attr:aria-selected",
      "data-attr:title"
    ]) {
      for (const expression of attributeValues(html, attribute)) {
        expect(() => new Script(expression)).not.toThrow()
      }
    }
  })

  it("allows a typed local state name", () => {
    const html = renderToString(<DatastarDebugger stateName="_myDebug" />)

    expect(JSON.parse(attributeValue(html, "data-signals__ifmissing"))).toEqual({
      _myDebug: datastarDebuggerDefaults()
    })
    expect(attributeValue(html, "data-bind")).toBe("_myDebug.search")
    expect(attributeValue(html, "data-on-signal-patch-filter")).toBe(
      "{exclude: /^_myDebug(\\.|$)/}"
    )
    expect(attributeValues(html, "data-text")).toContain('$_myDebug.events.length + " events"')
    expect(attributeValues(html, "data-on:click")).toContain("$_myDebug.events = []")
  })

  it("rejects non-local or nested debugger state names", () => {
    for (const stateName of ["debug", "_debug.nested", "_"]) {
      expect(() =>
        renderToString(<DatastarDebugger stateName={stateName as DatastarDebuggerStateName} />)
      ).toThrow(TypeError)
    }
  })

  it("exports the signal defaults used by the panel", () => {
    expect(datastarDebuggerDefaults()).toEqual({
      tab: "signals",
      search: "",
      paused: false,
      events: [],
      snapshots: [],
      travel: { index: -1, active: false, pending: false }
    })
  })

  it("records signal patches through the Datastar signal-patch handler", () => {
    const expression = attributeValue(renderToString(<DatastarDebugger />), "data-on-signal-patch")
    const debug = runtimeDebuggerState()
    const runtime = runtimeScope()

    runExpression(expression, {
      ...runtime.scope,
      [DEFAULT_SIGNAL_REF]: debug,
      patch: { count: 1 }
    })

    expect(debug.events).toHaveLength(1)
    expect(debug.events[0]).toMatchObject({
      kind: "signal",
      patch: { count: 1 }
    })
    expect(typeof debug.events[0]?.at).toBe("string")
  })

  it("caps retained signal events with maxEvents", () => {
    const expression = attributeValue(
      renderToString(<DatastarDebugger maxEvents={2} />),
      "data-on-signal-patch"
    )
    const debug = runtimeDebuggerState()
    const runtime = runtimeScope()

    for (const count of [1, 2, 3]) {
      runExpression(expression, {
        ...runtime.scope,
        [DEFAULT_SIGNAL_REF]: debug,
        patch: { count }
      })
    }

    expect(debug.events).toHaveLength(2)
    expect(debug.events.map((event) => (event.patch as { count: number }).count)).toEqual([3, 2])
  })

  it("does not record while paused", () => {
    const html = renderToString(<DatastarDebugger />)
    const signalExpression = attributeValue(html, "data-on-signal-patch")
    const fetchExpression = attributeValue(html, "data-on:datastar-fetch")
    const debug = { ...runtimeDebuggerState(), paused: true }

    runExpression(signalExpression, {
      [DEFAULT_SIGNAL_REF]: debug,
      patch: { count: 1 }
    })
    runExpression(fetchExpression, {
      [DEFAULT_SIGNAL_REF]: debug,
      $: { count: 1, [DATASTAR_DEBUGGER_STATE_NAME]: debug },
      evt: { detail: { type: "started", el: { id: "save" }, argsRaw: {} } }
    })

    expect(debug.events).toEqual([])
  })

  it("records Datastar fetch events with source labels and signal snapshots", () => {
    const expression = attributeValue(
      renderToString(<DatastarDebugger />),
      "data-on:datastar-fetch"
    )
    const debug = runtimeDebuggerState()

    runExpression(expression, {
      [DEFAULT_SIGNAL_REF]: debug,
      $: {
        count: 7,
        user: { name: "Ada" },
        [DATASTAR_DEBUGGER_STATE_NAME]: debug
      },
      evt: {
        detail: {
          type: "started",
          el: { id: "save" },
          argsRaw: {}
        }
      }
    })

    expect(debug.events[0]).toMatchObject({
      kind: "fetch",
      type: "started",
      element: "#save",
      argsRaw: {},
      signals: {
        count: 7,
        user: { name: "Ada" }
      }
    })
    expect(
      (debug.events[0]?.signals as Record<string, unknown> | undefined)?.[
        DATASTAR_DEBUGGER_STATE_NAME
      ]
    ).toBeUndefined()
  })

  it("records Datastar patch-element targets from fetch event args", () => {
    const expression = attributeValue(
      renderToString(<DatastarDebugger />),
      "data-on:datastar-fetch"
    )
    const debug = runtimeDebuggerState()

    const runtime = runtimeScope()

    runExpression(expression, {
      ...runtime.scope,
      [DEFAULT_SIGNAL_REF]: debug,
      $: { [DATASTAR_DEBUGGER_STATE_NAME]: debug },
      evt: {
        detail: {
          type: "datastar-patch-elements",
          el: { tagName: "MAIN" },
          argsRaw: {
            selector: "#todos",
            elements: '<section id="todos">Updated</section>'
          }
        }
      }
    })

    expect(debug.events[0]).toMatchObject({
      kind: "fetch",
      type: "datastar-patch-elements",
      element: "<main>",
      target: "#todos",
      argsRaw: {
        selector: "#todos",
        elements: '<section id="todos">Updated</section>'
      }
    })
    expect(debug.events[0]?.signals).toBeUndefined()
  })

  it("captures a timeline snapshot once the settle timer fires", () => {
    const expression = attributeValue(renderToString(<DatastarDebugger />), "data-on-signal-patch")
    const debug = runtimeDebuggerState()
    const runtime = runtimeScope("<main>snapshotted</main>")

    runExpression(expression, {
      ...runtime.scope,
      [DEFAULT_SIGNAL_REF]: debug,
      $: { count: 1, [DATASTAR_DEBUGGER_STATE_NAME]: debug },
      patch: { count: 1 }
    })

    expect(debug.travel.pending).toBe(true)
    expect(debug.snapshots).toEqual([])

    runtime.flushTimers()

    expect(debug.travel.pending).toBe(false)
    expect(debug.snapshots).toHaveLength(1)
    expect(debug.snapshots[0]).toMatchObject({
      label: "signal patch",
      html: "<main>snapshotted</main>",
      signals: { count: 1 }
    })
    expect(debug.snapshots[0]?.signals[DATASTAR_DEBUGGER_STATE_NAME]).toBeUndefined()
  })

  it("coalesces snapshot bursts and caps history with maxSnapshots", () => {
    const expression = attributeValue(
      renderToString(<DatastarDebugger maxSnapshots={1} />),
      "data-on-signal-patch"
    )
    const debug = runtimeDebuggerState()
    const runtime = runtimeScope()
    const signals: Record<string, unknown> = { count: 0, [DATASTAR_DEBUGGER_STATE_NAME]: debug }
    const scope = (count: number) => {
      signals.count = count
      return {
        ...runtime.scope,
        [DEFAULT_SIGNAL_REF]: debug,
        $: signals,
        patch: { count }
      }
    }

    runExpression(expression, scope(1))
    runExpression(expression, scope(2))
    expect(runtime.timers).toHaveLength(1)

    runtime.flushTimers()
    expect(debug.snapshots).toHaveLength(1)
    expect(debug.snapshots[0]?.signals).toEqual({ count: 2 })

    runExpression(expression, scope(3))
    runtime.flushTimers()
    expect(debug.snapshots).toHaveLength(1)
    expect(debug.snapshots[0]?.signals).toEqual({ count: 3 })
  })

  it("does not record events or snapshots while time traveling", () => {
    const html = renderToString(<DatastarDebugger />)
    const expression = attributeValue(html, "data-on-signal-patch")
    const debug = runtimeDebuggerState()
    debug.travel.active = true
    const runtime = runtimeScope()

    runExpression(expression, {
      ...runtime.scope,
      [DEFAULT_SIGNAL_REF]: debug,
      patch: { count: 1 }
    })

    expect(debug.events).toEqual([])
    expect(runtime.timers).toEqual([])
  })

  it("restores a snapshot when the timeline slider scrubs back", () => {
    const expression = attributeValue(
      renderToString(<DatastarDebugger />),
      "data-on:input__debounce.100ms"
    )
    const debug = runtimeDebuggerState()
    debug.snapshots = [
      { at: "10:00:00", label: "initial", html: "<main>old</main>", signals: { count: 0 } },
      { at: "10:00:05", label: "signal patch", html: "<main>new</main>", signals: { count: 2 } }
    ]
    const runtime = runtimeScope()
    const signals: Record<string, unknown> = {
      count: 2,
      newSignal: "created later",
      [DATASTAR_DEBUGGER_STATE_NAME]: debug
    }

    runExpression(expression, {
      ...runtime.scope,
      [DEFAULT_SIGNAL_REF]: debug,
      $: signals,
      evt: { target: { value: "0" } }
    })

    expect(debug.travel).toMatchObject({ index: 0, active: true })
    expect(runtime.otherChild.removed).toBe(true)
    expect(runtime.inserted).toEqual(["<main>old</main>"])

    runtime.flushTimers()
    expect(signals.count).toBe(0)
    expect(Object.hasOwn(signals, "newSignal")).toBe(false)
    expect(signals[DATASTAR_DEBUGGER_STATE_NAME]).toBe(debug)
  })

  it("ignores slider input at the live position when not time traveling", () => {
    const expression = attributeValue(
      renderToString(<DatastarDebugger />),
      "data-on:input__debounce.100ms"
    )
    const debug = runtimeDebuggerState()
    debug.snapshots = [
      { at: "10:00:00", label: "initial", html: "<main>old</main>", signals: { count: 0 } },
      { at: "10:00:05", label: "signal patch", html: "<main>new</main>", signals: { count: 2 } }
    ]
    const runtime = runtimeScope()

    runExpression(expression, {
      ...runtime.scope,
      [DEFAULT_SIGNAL_REF]: debug,
      $: { count: 2, [DATASTAR_DEBUGGER_STATE_NAME]: debug },
      evt: { target: { value: "1" } }
    })

    expect(debug.travel).toMatchObject({ index: -1, active: false })
    expect(runtime.inserted).toEqual([])
    expect(runtime.otherChild.removed).toBe(false)
  })

  it("returns to the newest snapshot and resumes recording via the Live button", () => {
    const html = renderToString(<DatastarDebugger />)
    const expression = attributeValues(html, "data-on:click").find((value) =>
      value.includes("travel.active = false")
    )
    expect(expression).toBeDefined()

    const debug = runtimeDebuggerState()
    debug.snapshots = [
      { at: "10:00:00", label: "initial", html: "<main>old</main>", signals: { count: 0 } },
      { at: "10:00:05", label: "signal patch", html: "<main>new</main>", signals: { count: 2 } }
    ]
    debug.travel = { index: 0, active: true, pending: false }
    const runtime = runtimeScope()
    const signals: Record<string, unknown> = {
      count: 0,
      [DATASTAR_DEBUGGER_STATE_NAME]: debug
    }

    runExpression(expression!, {
      ...runtime.scope,
      [DEFAULT_SIGNAL_REF]: debug,
      $: signals
    })

    expect(debug.travel).toMatchObject({ index: 1, active: false })
    expect(runtime.inserted).toEqual(["<main>new</main>"])

    runtime.flushTimers()
    expect(signals.count).toBe(2)
  })
})
