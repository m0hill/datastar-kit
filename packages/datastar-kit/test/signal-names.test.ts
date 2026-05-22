import { describe, expect, it } from "vitest"
import { dataSignals, signal, SignalNameError } from "../src/ds/index.js"

describe("Datastar signal name validation", () => {
  it("accepts normal, nested, and local signal names", () => {
    expect(signal<number, "count">("count").toDatastarExpression()).toBe("$count")
    expect(signal<string, "form.email">("form.email").toDatastarExpression()).toBe("$form.email")
    expect(signal<boolean, "_fetching">("_fetching").toDatastarExpression()).toBe("$_fetching")
  })

  it("rejects names Datastar would case-convert or fail to address predictably", () => {
    expect(() => signal<unknown, "first-name">("first-name")).toThrow(SignalNameError)
    expect(() => signal<unknown, "1count">("1count")).toThrow(SignalNameError)
    expect(() => signal<unknown, "form..email">("form..email")).toThrow(SignalNameError)
    expect(() => signal<unknown, "">("")).toThrow(SignalNameError)
  })

  it("throws early for invalid signal constructors", () => {
    expect(() => signal<number, "first-name">("first-name")).toThrow(SignalNameError)
  })

  it("throws early for invalid nested paths", () => {
    const form = signal<{ email: string }, "form">("form")

    expect(() => form.path("bad-key" as never)).toThrow(SignalNameError)
  })

  it("validates keys passed to dataSignals", () => {
    expect(dataSignals({ form: { email: "ada@example.com" } })).toEqual({
      "data-signals": '{"form": {"email": "ada@example.com"}}'
    })
    expect(() => dataSignals({ "bad-key": true })).toThrow(SignalNameError)
  })
})
