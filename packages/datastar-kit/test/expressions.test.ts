import { describe, expect, it } from "vitest"
import {
  action,
  ActionNameError,
  js,
  regex,
  RegexExpressionError,
  set,
  signal
} from "../src/ds/index.js"

describe("expression escape hatches", () => {
  it("keeps simple signal refs typed", () => {
    const saving = signal<boolean>("saving")

    expect(saving.toDatastarExpression()).toBe("$saving")
  })

  it("uses explicit Datastar expressions instead of a framework expression DSL", () => {
    expect(js("!($saving)").toDatastarExpression()).toBe("!($saving)")
    expect(js("($ready) && ($dirty)").toDatastarExpression()).toBe("($ready) && ($dirty)")
    expect(js('($enabled ? "Enabled" : "Disabled")').toDatastarExpression()).toBe(
      '($enabled ? "Enabled" : "Disabled")'
    )
  })

  it("interpolates Datastar expressions with signals and JS literals", () => {
    const count = signal<number>("count")

    expect(js`${count} >= ${10}`.toDatastarExpression()).toBe("$count >= 10")
    expect(js`${count} === ${"done"}`.toDatastarExpression()).toBe('$count === "done"')
  })

  it("builds regular expressions without caller-managed literal escaping", () => {
    expect(regex("a/b", "i").toDatastarExpression()).toBe('new RegExp("a/b", "i")')
    expect(() => regex("[")).toThrow(RegexExpressionError)
  })

  it("builds custom action expressions", () => {
    const modalOpen = signal<boolean>("modalOpen")

    expect(action("setSignal", "modalOpen", true).toDatastarExpression()).toBe(
      '@setSignal("modalOpen", true)'
    )
    expect(action("syncDialog", modalOpen).toDatastarExpression()).toBe("@syncDialog($modalOpen)")
  })

  it("rejects custom action names Datastar cannot call", () => {
    expect(() => action("bad-action")).toThrow(ActionNameError)
  })

  it("builds typed signal mutation expressions", () => {
    const open = signal<boolean>("open")

    expect(set(open, false).toDatastarExpression()).toBe("$open = false")
  })

  it("keeps signal mutation values typed to the target ref", () => {
    const open = signal<boolean>("open")

    if (false) {
      // @ts-expect-error Boolean signals cannot be assigned string literals.
      set(open, "yes")
    }

    expect(set(open, true).toDatastarExpression()).toBe("$open = true")
  })
})
