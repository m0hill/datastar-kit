import { describe, expect, it } from "vitest"
import { z } from "zod"
import * as read from "../src/read.js"

const CounterSignals = z.object({
  count: z.number()
})

describe("request read helpers", () => {
  it("decodes body-based Datastar signals from an explicit Request", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      headers: { "datastar-request": "true" },
      body: JSON.stringify({ count: 4 })
    })

    await expect(read.signals(request, CounterSignals)).resolves.toEqual({ count: 4 })
  })

  it("decodes GET Datastar signals from the datastar query parameter", async () => {
    const request = new Request(`http://localhost/signals?datastar=${encodeURIComponent('{"count":7}')}`)

    await expect(read.signals(request, CounterSignals)).resolves.toEqual({ count: 7 })
  })

  it("throws typed validation failures", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: "bad" })
    })

    await expect(read.signals(request, CounterSignals)).rejects.toBeInstanceOf(read.SignalValidationError)
  })

  it("throws typed parse failures for invalid JSON", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: "not json"
    })

    await expect(read.signals(request, CounterSignals)).rejects.toBeInstanceOf(read.SignalParseError)
  })
})
