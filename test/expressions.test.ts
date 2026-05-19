import { describe, expect, it } from "vitest"
import * as ds from "../src/ds.js"

describe("expression escape hatches", () => {
  it("keeps simple signal refs typed", () => {
    const saving = ds.signal<boolean>("saving")

    expect(saving.toDatastarExpression()).toBe("$saving")
  })

  it("uses raw Datastar expressions instead of a framework expression DSL", () => {
    expect(ds.raw("!($saving)").toDatastarExpression()).toBe("!($saving)")
    expect(ds.raw("($ready) && ($dirty)").toDatastarExpression()).toBe("($ready) && ($dirty)")
    expect(ds.raw("($enabled ? \"Enabled\" : \"Disabled\")").toDatastarExpression()).toBe('($enabled ? "Enabled" : "Disabled")')
  })

  it("interpolates Datastar expressions with signals and JS literals", () => {
    const count = ds.signal<number>("count")

    expect(ds.expr`${count} >= ${10}`.toDatastarExpression()).toBe("$count >= 10")
    expect(ds.expr`${count} === ${"done"}`.toDatastarExpression()).toBe('$count === "done"')
  })

  it("composes raw expressions with Datastar attribute helpers", () => {
    expect(ds.dataClass("enabled", ds.raw("($enabled) && (!$saving)"))).toEqual({
      "data-class:enabled": "($enabled) && (!$saving)"
    })
    expect(ds.dataAttr("aria-disabled", ds.raw("!($enabled)"))).toEqual({
      "data-attr:aria-disabled": "!($enabled)"
    })
    expect(ds.text(ds.raw('($enabled ? "On" : "Off")'))).toEqual({
      "data-text": '($enabled ? "On" : "Off")'
    })
  })
})
