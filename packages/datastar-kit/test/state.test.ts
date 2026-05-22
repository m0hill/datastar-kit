import { describe, expect, it } from "vitest"
import { dataSignals, SignalNameError, state } from "../src/ds/index.js"
import type { SignalState } from "../src/types.js"

describe("state helpers", () => {
  it("creates default data-signals attributes with missing-only initialization", () => {
    const form = state({ name: "", email: "", errors: { name: "", email: "" } })

    expect(form.attrs()).toEqual({
      "data-signals__ifmissing": '{"name": "", "email": "", "errors": {"name": "", "email": ""}}'
    })
    expect(form.attrs({ ifMissing: false })).toEqual(dataSignals(form.defaults))
  })

  it("creates nested signal refs from one defaults object", () => {
    const form = state({ name: "", errors: { name: "" } })

    expect(form.refs.name.toDatastarExpression()).toBe("$name")
    expect(form.$.errors.name.toDatastarExpression()).toBe("$errors.name")
  })

  it("returns type-checked signal patch objects", () => {
    const form = state({ name: "", email: "", errors: { name: "", email: "" } })
    const errors: { readonly name: string; readonly email: string } = {
      name: "Enter your name",
      email: "Enter a valid email"
    }

    const patch: SignalState = form.patch({ errors })

    expect(patch).toEqual({ errors })
  })

  it("rejects invalid patch keys and values at compile time", () => {
    const form = state({ name: "", subscribed: false, errors: { name: "", email: "" } })

    if (false) {
      // @ts-expect-error Unknown top-level signal key.
      form.patch({ missing: "" })
      // @ts-expect-error Unknown nested signal key.
      form.patch({ errors: { missing: "" } })
      // @ts-expect-error Signal patch value must match the default value type.
      form.patch({ subscribed: "yes" })
      // @ts-expect-error Reset overrides are checked like signal patches.
      form.reset({ errors: { email: false } })
      // @ts-expect-error Nested object refs are not signal refs themselves.
      form.$.errors.toDatastarExpression()
    }

    expect(form.patch({ subscribed: true })).toEqual({ subscribed: true })
  })

  it("resets defaults with optional nested overrides", () => {
    const form = state({ name: "", email: "", errors: { name: "", email: "" } })

    expect(form.reset()).toEqual({ name: "", email: "", errors: { name: "", email: "" } })
    expect(form.reset({ errors: { email: "Enter a valid email" } })).toEqual({
      name: "",
      email: "",
      errors: { name: "", email: "Enter a valid email" }
    })
  })

  it("throws early for invalid state keys", () => {
    expect(() => state({ "bad-key": "" })).toThrow(SignalNameError)
    expect(() => state({ "bad-key": {} })).toThrow(SignalNameError)
    expect(() => state({ "errors.name": "" })).toThrow(SignalNameError)
    expect(() => state({ errors: { "field.email": "" } })).toThrow(SignalNameError)
  })
})
