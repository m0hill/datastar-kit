import type { StandardSchemaV1 } from "@standard-schema/spec"
import { describe, expect, it } from "vitest"
import { dataSignals, signal } from "../src/ds/index.js"
import * as read from "../src/read.js"
import * as reply from "../src/reply.js"

const CounterSignals: StandardSchemaV1<unknown, { readonly count: number }> = {
  "~standard": {
    version: 1,
    vendor: "test",
    validate(value) {
      if (
        typeof value === "object" &&
        value !== null &&
        "count" in value &&
        typeof value.count === "number"
      ) {
        return { value: { count: value.count } }
      }

      return {
        issues: [
          {
            message: "Expected numeric count",
            path: ["count"]
          }
        ]
      }
    }
  }
}

describe("Standard Schema Datastar signal boundary", () => {
  it("keeps typed signal refs explicit instead of schema-derived contracts", () => {
    const count = signal<number, "count">("count")

    expect(count.toDatastarExpression()).toBe("$count")
    expect(dataSignals({ count: 0 }, { ifMissing: true })).toEqual({
      "data-signals__ifmissing": "{\"count\": 0}"
    })
  })

  it("uses any Standard Schema-compatible validator at the request boundary", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: 1 })
    })

    const parsed = await read.signals(request, CounterSignals)
    const exact: { readonly count: number } = parsed

    expect(exact).toEqual({ count: 1 })
  })

  it("surfaces Standard Schema issues without depending on a validator library", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: "bad" })
    })

    await expect(read.signals(request, CounterSignals)).rejects.toMatchObject({
      issues: [{ message: "Expected numeric count", path: ["count"] }]
    })
  })

  it("patches validated signal output with normal response helpers", async () => {
    const response = reply.signals({ count: 2 })

    expect(await response.text()).toBe(
      'event: datastar-patch-signals\ndata: signals {"count":2}\n\n'
    )
  })
})
