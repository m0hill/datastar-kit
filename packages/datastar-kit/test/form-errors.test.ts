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
  it("maps the first issue per field, including nested fields, and reports unmatched issues", () => {
    const { errors, unmatched } = fieldErrors(
      signup.defaults.errors,
      issuesFor({ email: "nope", password: "short", address: { city: "" } })
    )

    expect(errors).toEqual({
      email: "Enter a valid email",
      password: "Use at least 8 characters",
      address: { city: "Enter a city" }
    })
    expect(unmatched).toEqual([expect.objectContaining({ message: "Accept the terms" })])
  })

  it("clears fields without issues so resolved errors disappear", () => {
    const { errors } = fieldErrors(
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
    ).toEqual({ errors: { address: { city: "Enter a city" } }, unmatched: [] })
  })

  it("reports form-level issues without a path as unmatched", () => {
    const formLevel = { message: "Passwords must match" }

    expect(fieldErrors({ password: "" }, [formLevel])).toEqual({
      errors: { password: "" },
      unmatched: [formLevel]
    })
  })

  it("is typed to the error group so state patches still reject typos", () => {
    const { errors } = fieldErrors(signup.defaults.errors, [])

    expectTypeOf(errors).toEqualTypeOf<{
      readonly email: string
      readonly password: string
      readonly address: { readonly city: string }
    }>()
    expectTypeOf({ errors }).toExtend<Parameters<typeof signup.patch>[0]>()
  })
})
