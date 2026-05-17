import { describe, expect, it } from "vitest"
import { and, dataClass, dataAttr, not, or, raw, signal, ternary, text } from "../src/datastar.js"

describe("expression helpers", () => {
  it("builds negated expressions", () => {
    const saving = signal<boolean, "saving">("saving")

    expect(not(saving).toDatastarExpression()).toBe("!($saving)")
  })

  it("builds conjunctions and disjunctions", () => {
    const ready = signal<boolean, "ready">("ready")
    const dirty = signal<boolean, "dirty">("dirty")

    expect(and(ready, dirty).toDatastarExpression()).toBe("($ready) && ($dirty)")
    expect(or(ready, dirty).toDatastarExpression()).toBe("($ready) || ($dirty)")
  })

  it("uses identity values for empty boolean folds", () => {
    expect(and().toDatastarExpression()).toBe("true")
    expect(or().toDatastarExpression()).toBe("false")
  })

  it("builds ternary expressions", () => {
    const enabled = signal<boolean, "enabled">("enabled")

    expect(ternary(enabled, "Enabled", "Disabled").toDatastarExpression()).toBe('($enabled ? "Enabled" : "Disabled")')
  })

  it("composes with Datastar attribute helpers", () => {
    const enabled = signal<boolean, "enabled">("enabled")

    expect(dataClass("enabled", and(enabled, raw("!$saving")))).toEqual({
      "data-class:enabled": "($enabled) && (!$saving)"
    })
    expect(dataAttr("aria-disabled", not(enabled))).toEqual({
      "data-attr:aria-disabled": "!($enabled)"
    })
    expect(text(ternary(enabled, "On", "Off"))).toEqual({
      "data-text": '($enabled ? "On" : "Off")'
    })
  })
})
