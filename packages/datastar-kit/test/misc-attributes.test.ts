import { describe, expect, it } from "vitest"
import { jsonSignals, preserveAttr, ref, regex, signal, SignalNameError } from "../src/ds/index.js"

describe("misc Datastar attribute helpers", () => {
  it("builds data-ref attributes from names and signals", () => {
    expect(ref("panel")).toEqual({ "data-ref:panel": true })
    expect(ref(signal<HTMLElement, "dialog">("dialog"))).toEqual({ "data-ref:dialog": true })
  })

  it("validates data-ref signal names", () => {
    expect(() => ref("bad-name")).toThrow(SignalNameError)
  })

  it("builds JSON signal inspector attributes", () => {
    expect(jsonSignals()).toEqual({ "data-json-signals": true })
    expect(jsonSignals({ include: regex("^user") }, { terse: true })).toEqual({
      "data-json-signals__terse": '{"include": /^user/}'
    })
  })

  it("builds preserve-attr attributes", () => {
    expect(preserveAttr("open", "class")).toEqual({
      "data-preserve-attr": "open class"
    })
  })
})
