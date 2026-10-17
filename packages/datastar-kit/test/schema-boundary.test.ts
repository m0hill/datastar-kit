import { describe, expect, expectTypeOf, it } from "vitest"
import { z } from "zod"
import { signal } from "../src/ds/index.js"
import * as read from "../src/read.js"
import * as reply from "../src/reply.js"
import type { StandardSchemaV1 } from "../src/standard-schema.js"

const CounterSignals = z.object({
  count: z.number()
})

describe("Datastar signal boundary", () => {
  it("keeps typed signal refs explicit instead of schema-derived contracts", () => {
    const count = signal<number, "count">("count")

    expect(count.toDatastarExpression()).toBe("$count")
  })

  it("leaves app validation to the caller after decoding Datastar signals", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: 1 })
    })

    const parsed = CounterSignals.parse(await read.signals(request))
    const exact: { readonly count: number } = parsed

    expect(exact).toEqual({ count: 1 })
  })

  it("lets validator-specific errors stay validator-specific", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: "bad" })
    })

    const signals = await read.signals(request)

    expect(() => CounterSignals.parse(signals)).toThrow(z.ZodError)
  })

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

  it("patches validated signal output with normal response helpers", async () => {
    const response = reply.signals({ count: 2 })

    expect(await response.text()).toBe(
      'event: datastar-patch-signals\ndata: signals {"count":2}\n\n'
    )
  })
})
