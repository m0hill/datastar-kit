import { describe, expect, it } from "vitest"
import * as read from "../src/read.js"

describe("request read helpers", () => {
  it("decodes body-based Datastar signals from an explicit Request", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      headers: { "datastar-request": "true" },
      body: JSON.stringify({ count: 4 })
    })

    await expect(read.signals(request)).resolves.toEqual({ count: 4 })
  })

  it("decodes GET Datastar signals from the datastar query parameter", async () => {
    const request = new Request(`http://localhost/signals?datastar=${encodeURIComponent('{"count":7}')}`)

    await expect(read.signals(request)).resolves.toEqual({ count: 7 })
  })

  it("decodes parsed signal state without forcing schema validation", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: "7", nested: { ok: true } })
    })

    await expect(read.signals(request)).resolves.toEqual({ count: "7", nested: { ok: true } })
  })

  it("rejects non-object signal payloads without a schema", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify(["not", "signals"])
    })

    await expect(read.signals(request)).rejects.toBeInstanceOf(read.SignalShapeError)
  })

  it("throws typed parse failures for invalid JSON", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: "not json"
    })

    await expect(read.signals(request)).rejects.toBeInstanceOf(read.SignalParseError)
  })
})
