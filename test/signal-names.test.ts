import { describe, expect, it } from "vitest"
import { dataSignals, isSignalName, signal, SignalNameError, signals } from "../src/datastar.js"

describe("Datastar signal name validation", () => {
  it("accepts normal, nested, and local signal names", () => {
    expect(isSignalName("count")).toBe(true)
    expect(isSignalName("form.email")).toBe(true)
    expect(isSignalName("_fetching")).toBe(true)
  })

  it("rejects names Datastar would case-convert or fail to address predictably", () => {
    expect(isSignalName("first-name")).toBe(false)
    expect(isSignalName("1count")).toBe(false)
    expect(isSignalName("form..email")).toBe(false)
    expect(isSignalName("")).toBe(false)
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

  it("signal records still create validated signal refs", () => {
    const $ = signals<{ count: number }>()

    expect($.count.toDatastarExpression()).toBe("$count")
  })
})
