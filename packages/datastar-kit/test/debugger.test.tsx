import { describe, expect, it } from "vitest"
import { renderToString } from "../src/html.js"
import {
  DATASTAR_DEBUGGER_STATE_NAME,
  DatastarDebugger,
  datastarDebuggerDefaults
} from "../src/debugger.js"

describe("Datastar debugger", () => {
  it("renders as ordinary Datastar-authored HTML", () => {
    const html = renderToString(<DatastarDebugger open={false} />)

    expect(html).toContain('id="datastar-kit-debugger"')
    expect(html).toContain("data-signals__ifmissing")
    expect(html).toContain(DATASTAR_DEBUGGER_STATE_NAME)
    expect(html).toContain("data-on-signal-patch")
    expect(html).toContain("data-on:datastar-fetch__document")
    expect(html).toContain("data-text")
    expect(html).toContain("data-bind")
    expect(html).toContain("data-effect")
    expect(html).toContain("patchTargetLabel")
    expect(html).toContain("Signals")
    expect(html).toContain("Events")
    expect(html).not.toContain("<table")
    expect(html).not.toContain("datastar-debugger")
  })

  it("allows a typed local state name", () => {
    const html = renderToString(<DatastarDebugger stateName="_myDebug" />)

    expect(html).toContain("_myDebug")
    expect(html).toContain('data-bind="_myDebug.search"')
    expect(html).toContain("$_myDebug.events.length")
  })

  it("rejects non-local or nested debugger state names", () => {
    expect(() => renderToString(<DatastarDebugger stateName={"debug" as "_debug"} />)).toThrow(
      TypeError
    )
    expect(() =>
      renderToString(<DatastarDebugger stateName={"_debug.nested" as "_debug"} />)
    ).toThrow(TypeError)
  })

  it("exports the signal defaults used by the panel", () => {
    expect(datastarDebuggerDefaults()).toEqual({
      tab: "signals",
      search: "",
      paused: false,
      events: []
    })
  })
})
