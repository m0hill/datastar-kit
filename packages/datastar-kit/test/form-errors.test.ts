import { describe, expect, expectTypeOf, it } from "vitest"
import { z } from "zod"
import { fieldErrors } from "../src/form-errors.js"
import { state } from "../src/ds/index.js"

const signup = state({
  email: "",
  address: { city: "" },
  errors: {
    email: "",
    password: "",
    address: { city: "" }
  }
})

const SignupInput = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").min(12, "Use at least 12 characters"),
  address: z.object({ city: z.string().min(1, "Enter a city") }),
  terms: z.literal(true, "Accept the terms")
})

const issuesFor = (input: unknown) => {
  const result = SignupInput["~standard"].validate(input)
  if (result instanceof Promise || result.issues === undefined) throw new Error("expected issues")
  return result.issues
}

describe("fieldErrors", () => {
  it("maps the first issue per field, including nested fields, and ignores unknown paths", () => {
    const errors = fieldErrors(
      signup.defaults.errors,
      issuesFor({ email: "nope", password: "short", address: { city: "" } })
    )

    expect(errors).toEqual({
      email: "Enter a valid email",
      password: "Use at least 8 characters",
      address: { city: "Enter a city" }
    })
  })

  it("clears fields without issues so resolved errors disappear", () => {
    const errors = fieldErrors(
      signup.defaults.errors,
      issuesFor({ email: "a@b.co", password: "long enough password", address: { city: "" } })
    )

    expect(errors).toEqual({ email: "", password: "", address: { city: "Enter a city" } })
  })

  it("accepts path segment objects from Standard Schema issues", () => {
    expect(
      fieldErrors({ address: { city: "" } }, [
        { message: "Enter a city", path: [{ key: "address" }, { key: "city" }] }
      ])
    ).toEqual({ address: { city: "Enter a city" } })
  })

  it("produces a value accepted by the matching state patch", () => {
    const errors = fieldErrors(signup.defaults.errors, [])

    expectTypeOf(errors).toEqualTypeOf<{
      readonly email: string
      readonly password: string
      readonly address: { readonly city: string }
    }>()
    expect(signup.patch({ errors })).toEqual({
      errors: { email: "", password: "", address: { city: "" } }
    })
  })
})
