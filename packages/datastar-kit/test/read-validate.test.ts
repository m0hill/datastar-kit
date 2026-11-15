import { describe, expect, expectTypeOf, it } from "vitest"
import { z } from "zod"
import * as read from "../src/read.js"

const CounterSignals = z.object({
  count: z.number()
})

describe("read.validate", () => {
  it("validates decoded signals with any Standard Schema and infers the output type", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: 1 })
    })

    const result = await read.validate(request, CounterSignals)

    if (result.issues) throw new Error("expected valid signals")
    expectTypeOf(result.value).toEqualTypeOf<{ count: number }>()
    expect(result.value).toEqual({ count: 1 })
  })

  it("returns validation issues instead of throwing", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: "bad" })
    })

    const result = await read.validate(request, CounterSignals)

    expect(result.issues).toEqual([expect.objectContaining({ path: ["count"] })])
  })

  it("awaits asynchronous Standard Schema validators", async () => {
    // Any object with a `~standard` property is a schema, so a hand-written one stands in here.
    const Even: Parameters<typeof read.validate>[1] = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async (value) =>
          CounterSignals.parse(value).count % 2 === 0
            ? { value: { even: true } }
            : { issues: [{ message: "Count must be even", path: ["count"] }] }
      }
    }
    const request = (count: number) =>
      new Request("http://localhost/increment", {
        method: "POST",
        body: JSON.stringify({ count })
      })

    await expect(read.validate(request(2), Even)).resolves.toEqual({ value: { even: true } })
    await expect(read.validate(request(3), Even)).resolves.toEqual({
      issues: [{ message: "Count must be even", path: ["count"] }]
    })
  })

  it("flattens issues into form messages and dot-path field messages", async () => {
    const Signup = z
      .object({
        email: z.string().email("Enter a valid email"),
        address: z.object({ city: z.string().min(1, "Enter a city") }),
        tags: z.array(z.string().min(1, "Tags cannot be empty")),
        password: z.string(),
        confirm: z.string()
      })
      .refine((input) => input.password === input.confirm, "Passwords must match")
    const request = new Request("http://localhost/signup", {
      method: "POST",
      body: JSON.stringify({
        email: "ada@example.com",
        address: { city: "" },
        tags: ["ok", ""],
        password: "one",
        confirm: "two"
      })
    })

    const result = await read.validate(request, Signup)
    if (!result.issues) throw new Error("expected issues")

    expect(read.flattenIssues(result.issues)).toEqual({
      form: ["Passwords must match"],
      fields: { "address.city": ["Enter a city"], "tags.1": ["Tags cannot be empty"] }
    })
  })

  it("reads { key } path segments, and treats a path with a symbol key as form-wide", () => {
    const issues = [
      { message: "Enter a title", path: [{ key: "post" }, { key: "title" }] },
      { message: "Too long", path: ["post", "title"] },
      { message: "Bad metadata", path: [Symbol("meta")] }
    ]

    expect(read.flattenIssues(issues)).toEqual({
      form: ["Bad metadata"],
      fields: { "post.title": ["Enter a title", "Too long"] }
    })
  })

  it("still throws decode errors before validation runs", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: "not json"
    })

    await expect(read.validate(request, CounterSignals)).rejects.toBeInstanceOf(
      read.SignalParseError
    )
  })
})
