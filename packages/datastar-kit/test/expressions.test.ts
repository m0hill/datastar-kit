import { describe, expect, it } from "vitest"
import * as ds from "../src/ds/index.js"

describe("expression escape hatches", () => {
  it("keeps simple signal refs typed", () => {
    const saving = ds.signal<boolean>("saving")

    expect(saving.toDatastarExpression()).toBe("$saving")
  })

  it("uses explicit Datastar expressions instead of a framework expression DSL", () => {
    expect(ds.expr("!($saving)").toDatastarExpression()).toBe("!($saving)")
    expect(ds.expr("($ready) && ($dirty)").toDatastarExpression()).toBe("($ready) && ($dirty)")
    expect(ds.expr('($enabled ? "Enabled" : "Disabled")').toDatastarExpression()).toBe(
      '($enabled ? "Enabled" : "Disabled")'
    )
  })

  it("interpolates Datastar expressions with signals and JS literals", () => {
    const count = ds.signal<number>("count")

    expect(ds.expr`${count} >= ${10}`.toDatastarExpression()).toBe("$count >= 10")
    expect(ds.expr`${count} === ${"done"}`.toDatastarExpression()).toBe('$count === "done"')
  })

  it("builds regular expressions without caller-managed literal escaping", () => {
    expect(ds.regex("a/b", "i").toDatastarExpression()).toBe('new RegExp("a/b", "i")')
    expect(() => ds.regex("[")).toThrow(ds.RegexExpressionError)
  })

  it("builds custom action expressions", () => {
    const modalOpen = ds.signal<boolean>("modalOpen")

    expect(ds.action("setSignal", "modalOpen", true).toDatastarExpression()).toBe(
      '@setSignal("modalOpen", true)'
    )
    expect(ds.action("syncDialog", modalOpen).toDatastarExpression()).toBe(
      "@syncDialog($modalOpen)"
    )
  })

  it("rejects custom action names Datastar cannot call", () => {
    expect(() => ds.action("bad-action")).toThrow(ds.ActionNameError)
  })

  it("builds common signal mutation expressions", () => {
    const open = ds.signal<boolean>("open")

    expect(ds.set(open, false).toDatastarExpression()).toBe("$open = false")
    expect(ds.sequence(ds.post("/save"), ds.set(open, false)).toDatastarExpression()).toBe(
      '@post("/save"); $open = false'
    )
    expect(ds.when(ds.expr`!${open}`, ds.get("/open")).toDatastarExpression()).toBe(
      'if (!$open) { @get("/open") }'
    )
  })

  it("keeps signal mutation values typed to the target ref", () => {
    const open = ds.signal<boolean>("open")

    if (false) {
      // @ts-expect-error Boolean signals cannot be assigned string literals.
      ds.set(open, "yes")
    }

    expect(ds.set(open, true).toDatastarExpression()).toBe("$open = true")
  })

  it("composes explicit expressions with Datastar attribute helpers", () => {
    expect(ds.dataClass("enabled", ds.expr("($enabled) && (!$saving)"))).toEqual({
      "data-class:enabled": "($enabled) && (!$saving)"
    })
    expect(ds.dataAttr("aria-disabled", ds.expr("!($enabled)"))).toEqual({
      "data-attr:aria-disabled": "!($enabled)"
    })
    expect(ds.text(ds.expr('($enabled ? "On" : "Off")'))).toEqual({
      "data-text": '($enabled ? "On" : "Off")'
    })
  })
})
