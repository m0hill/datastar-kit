import { describe, expect, it } from "vitest"
import { inspectDatastarAttributeName } from "./attribute-name.js"

describe("inspectDatastarAttributeName", () => {
  it("classifies canonical names, ignoring keys and modifiers", () => {
    expect(inspectDatastarAttributeName("data-show")).toEqual({ _tag: "known", name: "data-show" })
    expect(inspectDatastarAttributeName("data-on:click__prevent")).toEqual({
      _tag: "known",
      name: "data-on"
    })
  })

  it("suggests the nearest canonical name for likely typos", () => {
    expect(inspectDatastarAttributeName("data-shwo:key__once")).toEqual({
      _tag: "custom",
      baseName: "data-shwo",
      suggestion: "data-show"
    })
    expect(inspectDatastarAttributeName("data-tooltip")).toEqual({
      _tag: "custom",
      baseName: "data-tooltip",
      suggestion: undefined
    })
  })

  it("reports key policy violations", () => {
    expect(inspectDatastarAttributeName("data-on")).toEqual({
      _tag: "invalid",
      category: "key",
      message: "\"data-on\" requires a key after ':'"
    })
    expect(inspectDatastarAttributeName("data-show:panel")).toEqual({
      _tag: "invalid",
      category: "key",
      message: '"data-show" does not accept a key'
    })
    expect(inspectDatastarAttributeName("data-attr:")).toEqual({
      _tag: "invalid",
      category: "key",
      message: '"data-attr" has an empty key'
    })
  })

  it("reports unknown, misplaced, and unsupported modifiers", () => {
    expect(inspectDatastarAttributeName("data-on:click__preevent")).toEqual({
      _tag: "invalid",
      category: "modifier",
      message: 'Unknown Datastar modifier "preevent"'
    })
    expect(inspectDatastarAttributeName("data-on:click__prop.value")).toEqual({
      _tag: "invalid",
      category: "modifier",
      message: 'Modifier "prop" is not valid on "data-on:click"'
    })
    expect(inspectDatastarAttributeName("data-show__once")).toEqual({
      _tag: "invalid",
      category: "modifier",
      message: '"data-show" does not accept modifiers'
    })
  })
})
