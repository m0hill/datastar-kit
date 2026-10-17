import { describe, expect, it } from "vitest"
import { action, ActionNameError, regex, RegexExpressionError } from "../src/ds/index.js"

describe("expression builders", () => {
  it("rejects regular expressions that cannot be constructed", () => {
    expect(() => regex("[")).toThrow(RegexExpressionError)
    expect(() => regex("a", "zz")).toThrow(RegexExpressionError)
  })

  it("rejects custom action names Datastar cannot call", () => {
    expect(() => action("bad-action")).toThrow(ActionNameError)
    expect(() => action("1st")).toThrow(ActionNameError)
  })
})
