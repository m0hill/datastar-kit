import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { executeScript, patchElements, patchSignals } from "../src/sse.js"

const fixture = (name: string): string =>
  readFileSync(resolve("..", "datastar", "sdk", "test", "get-cases", name, "output.txt"), "utf8")

describe("additional Datastar SDK fixtures", () => {
  it("matches the multiline patch-elements fixture", () => {
    expect(patchElements("<div>\n  <span>Merge</span>\n</div>")).toBe(fixture("patchElementsWithMultilineElements"))
  })

  it("matches the multiline patch-signals fixture", () => {
    expect(patchSignals({ one: "first\n signal", two: "second signal" })).toBe(fixture("patchSignalsWithMultilineSignals"))
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
