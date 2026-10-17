import { describe, expect, expectTypeOf, it } from "vitest"
import { z } from "zod"
import * as read from "../src/read.js"
import type { StandardSchemaV1 } from "../src/standard-schema.js"

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
    const Even: StandardSchemaV1<unknown, { readonly even: true }> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: async (value) =>
          (value as { readonly count: number }).count % 2 === 0
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
