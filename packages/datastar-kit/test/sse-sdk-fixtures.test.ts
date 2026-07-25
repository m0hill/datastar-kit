import { describe, expect, it } from "vitest"
import { executeScript, patchElements, patchSignals } from "../src/sse.js"

const fixtures = {
  patchElementsWithMultilineElements:
    "event: datastar-patch-elements\ndata: elements <div>\ndata: elements   <span>Merge</span>\ndata: elements </div>\n\n",
  patchSignalsWithMultilineSignals:
    'event: datastar-patch-signals\ndata: signals {"one":"first\\n signal","two":"second signal"}\n\n',
  patchSignalsWithMultilineJson:
    'event: datastar-patch-signals\ndata: signals {\ndata: signals "one": "first signal",\ndata: signals "two":  \ndata: signals "second signal"}\n\n',
  removeElementsWithAllOptions:
    "event: datastar-patch-elements\nid: event1\nretry: 2000\ndata: selector #target\ndata: mode remove\ndata: useViewTransition true\n\n",
  removeSignalsWithDefaults: 'event: datastar-patch-signals\ndata: signals {"one":null}\n\n',
  removeSignalsWithAllOptions:
    'event: datastar-patch-signals\nid: event1\nretry: 2000\ndata: signals {"one":null,"two":{"alpha":null}}\n\n',
  executeScriptWithDefaults:
    "event: datastar-patch-elements\ndata: mode append\ndata: selector body\ndata: elements <script data-effect=\"el.remove()\">console.log('hello');</script>\n\n",
  executeScriptWithAllOptions:
    'event: datastar-patch-elements\nid: event1\nretry: 2000\ndata: mode append\ndata: selector body\ndata: elements <script type="text/javascript" blocking="false">console.log(\'hello\');</script>\n\n'
} as const

const fixture = (name: keyof typeof fixtures): string => fixtures[name]

describe("additional Datastar SDK fixtures", () => {
  it("matches the multiline patch-elements fixture", () => {
    expect(patchElements("<div>\n  <span>Merge</span>\n</div>")).toBe(
      fixture("patchElementsWithMultilineElements")
    )
  })

  it("matches the multiline patch-signals fixture", () => {
    expect(patchSignals({ one: "first\n signal", two: "second signal" })).toBe(
      fixture("patchSignalsWithMultilineSignals")
    )
  })

  it("matches the raw multiline patch-signals fixture", () => {
    expect(patchSignals('{\n"one": "first signal",\n"two":  \n"second signal"}')).toBe(
      fixture("patchSignalsWithMultilineJson")
    )
  })

  it("matches remove-elements fixtures through remove mode", () => {
    expect(
      patchElements("", {
        id: "event1",
        retry: 2000,
        selector: "#target",
        mode: "remove",
        useViewTransition: true
      })
    ).toBe(fixture("removeElementsWithAllOptions"))
  })

  it("matches remove-signals fixtures through explicit null patches", () => {
    expect(patchSignals({ one: null })).toBe(fixture("removeSignalsWithDefaults"))
    expect(patchSignals({ one: null, two: { alpha: null } }, { id: "event1", retry: 2000 })).toBe(
      fixture("removeSignalsWithAllOptions")
    )
  })

  it("matches execute-script fixtures", () => {
    expect(executeScript("console.log('hello');")).toBe(fixture("executeScriptWithDefaults"))
    expect(
      executeScript("console.log('hello');", {
        id: "event1",
        retry: 2000,
        attributes: {
          type: "text/javascript",
          blocking: "false"
        },
        autoRemove: false
      })
    ).toBe(fixture("executeScriptWithAllOptions"))
  })
})
