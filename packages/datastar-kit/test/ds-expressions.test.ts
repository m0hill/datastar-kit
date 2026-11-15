import { describe, expect, it } from "vitest"
import { action, ActionNameError, js, regex, RegexExpressionError } from "../src/ds/index.js"

describe("expression builders", () => {
  it("rejects regular expressions that cannot be constructed", () => {
    expect(() => regex("[")).toThrow(RegexExpressionError)
    expect(() => regex("a", "zz")).toThrow(RegexExpressionError)
  })

  it("rejects custom action names Datastar cannot call", () => {
    expect(() => action("bad-action")).toThrow(ActionNameError)
    expect(() => action("1st")).toThrow(ActionNameError)
  })

  it("renders bigints as bigint literals", () => {
    expect(js`${10n} + $count`.toDatastarExpression()).toBe("10n + $count")
  })

  it("rejects values with no Datastar expression form", () => {
    expect(() => js`${() => 1}`).toThrow("Cannot serialize a function")
    expect(() => js`${Symbol("id")}`).toThrow("Cannot serialize a symbol")
  })
})
