import { describe, expect, it } from "vitest"
import {
  jsonSignals,
  pluginAttr,
  PluginAttributeNameError,
  preserveAttr,
  ref,
  regex,
  signal,
  SignalNameError
} from "../src/ds/index.js"

describe("misc Datastar attribute helpers", () => {
  it("builds data-ref attributes from names and signals", () => {
    expect(ref("panel")).toEqual({ "data-ref": "panel" })
    expect(ref(signal<HTMLElement, "dialog">("dialog"))).toEqual({ "data-ref": "dialog" })
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

  it("builds custom plugin attributes", () => {
    const modalOpen = signal<boolean, "modalOpen">("modalOpen")

    expect(pluginAttr("alert", "Hello from an attribute")).toEqual({
      "data-alert": '"Hello from an attribute"'
    })
    expect(pluginAttr("focus-when", modalOpen)).toEqual({
      "data-focus-when": "$modalOpen"
    })
    expect(pluginAttr("match-media:is-dark", "prefers-color-scheme: dark")).toEqual({
      "data-match-media:is-dark": '"prefers-color-scheme: dark"'
    })
    expect(pluginAttr("loaded")).toEqual({ "data-loaded": true })
  })

  it("rejects invalid custom plugin attribute names", () => {
    expect(() => pluginAttr("data-alert", "bad")).toThrow(PluginAttributeNameError)
    expect(() => pluginAttr("bad attr", "bad")).toThrow(PluginAttributeNameError)
    expect(() => pluginAttr("bad:attr:again", "bad")).toThrow(PluginAttributeNameError)
  })
})
