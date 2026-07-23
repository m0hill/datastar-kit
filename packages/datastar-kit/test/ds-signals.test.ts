import { describe, expect, it } from "vitest"
import { get, js, local, queryUrl, signal, SignalNameError, state } from "../src/ds/index.js"
import type { Expr, Signal } from "../src/ds/index.js"

describe("Datastar signal refs", () => {
  it("accepts normal, nested, and local signal names", () => {
    const form = signal<{ email: string }, "form">("form")

    expect(signal<number, "count">("count").toDatastarExpression()).toBe("$count")
    expect(signal<string, "form.email">("form.email").toDatastarExpression()).toBe("$form.email")
    expect(signal<boolean, "_fetching">("_fetching").toDatastarExpression()).toBe("$_fetching")
    expect(form.path("email").toDatastarExpression()).toBe("$form.email")
  })

  it("rejects names Datastar would case-convert or fail to address predictably", () => {
    expect(() => signal<unknown, "first-name">("first-name")).toThrow(SignalNameError)
    expect(() => signal<unknown, "1count">("1count")).toThrow(SignalNameError)
    expect(() => signal<unknown, "form..email">("form..email")).toThrow(SignalNameError)
    expect(() => signal<unknown, "">("")).toThrow(SignalNameError)
  })

  it("creates underscore-prefixed local signal refs without double-prefixing", () => {
    expect(local<boolean>("saving").toDatastarExpression()).toBe("$_saving")
    expect(local<boolean, "_saving">("_saving").toDatastarExpression()).toBe("$_saving")
  })

  it("preserves signal and expression value types", () => {
    const count = signal<number>("count")
    const numericExpression = js<number>("$count")
    const countRef = state({ count: 0 }).refs.count

    if (false) {
      // @ts-expect-error A numeric signal is not a boolean signal.
      const booleanSignal: Signal<boolean> = count
      // @ts-expect-error A numeric signal is not a boolean expression.
      const booleanExpression: Expr<boolean> = count
      // @ts-expect-error A numeric expression is not a boolean expression.
      const booleanRawExpression: Expr<boolean> = numericExpression
      // @ts-expect-error Fetch action URLs require string expressions.
      get(count)
      // @ts-expect-error Query parameters require string, number, or boolean expressions.
      queryUrl("/search", { q: signal<{ id: number }>("object") })
      // @ts-expect-error Numeric state refs are not string signals.
      const stringRef: Signal<string> = countRef

      void booleanSignal
      void booleanExpression
      void booleanRawExpression
      void stringRef
    }

    expect(count.toDatastarExpression()).toBe("$count")
  })

  it("throws early for invalid nested paths", () => {
    const form = signal<{ email: string }, "form">("form")

    expect(() => form.path("bad-key" as never)).toThrow(SignalNameError)
  })
})
