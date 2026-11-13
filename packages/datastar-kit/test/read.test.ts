import { describe, expect, it } from "vitest"
import * as read from "../src/read.js"

describe("read.signals", () => {
  it("uses an empty object when no signal payload is present", async () => {
    await expect(read.signals(new Request("http://localhost/search"))).resolves.toEqual({})
    await expect(
      read.signals(new Request("http://localhost/increment", { method: "POST", body: "" }))
    ).resolves.toEqual({})
  })

  it("rejects non-object signal payloads without a schema", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify(["not", "signals"])
    })

    const sameRequest = request.clone()

    await expect(read.signals(request)).rejects.toMatchObject({
      input: ["not", "signals"]
    })
    await expect(read.signals(sameRequest)).rejects.toBeInstanceOf(read.SignalShapeError)
  })

  it("throws typed parse failures for invalid JSON", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: "not json"
    })

    const sameRequest = request.clone()

    await expect(read.signals(request)).rejects.toMatchObject({ input: "not json" })
    await expect(read.signals(sameRequest)).rejects.toBeInstanceOf(read.SignalParseError)
  })
})
