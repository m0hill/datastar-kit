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
    expect(ds.expr("($enabled ? \"Enabled\" : \"Disabled\")").toDatastarExpression()).toBe('($enabled ? "Enabled" : "Disabled")')
  })

  it("interpolates Datastar expressions with signals and JS literals", () => {
    const count = ds.signal<number>("count")

    expect(ds.expr`${count} >= ${10}`.toDatastarExpression()).toBe("$count >= 10")
    expect(ds.expr`${count} === ${"done"}`.toDatastarExpression()).toBe('$count === "done"')
  })

  it("builds custom action expressions", () => {
    const modalOpen = ds.signal<boolean>("modalOpen")

    expect(ds.action("setSignal", "modalOpen", true).toDatastarExpression()).toBe('@setSignal("modalOpen", true)')
    expect(ds.action("syncDialog", modalOpen).toDatastarExpression()).toBe("@syncDialog($modalOpen)")
  })

  it("rejects custom action names Datastar cannot call", () => {
    expect(() => ds.action("bad-action")).toThrow(ds.ActionNameError)
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
