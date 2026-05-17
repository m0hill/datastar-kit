import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import { patchSignalsResponse } from "../src/response.js"
import { readSignals } from "../src/request.js"

const CounterSignals = Schema.Struct({
  count: Schema.Number
})

describe("Effect signal decoding and responses", () => {
  it("decodes POST Datastar signal bodies with Effect Schema", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: 41 })
    })

    await expect(Effect.runPromise(readSignals(request, CounterSignals))).resolves.toEqual({ count: 41 })
  })

  it("decodes GET Datastar query signals with Effect Schema", async () => {
    const request = new Request(`http://localhost/search?datastar=${encodeURIComponent(JSON.stringify({ count: 2 }))}`)

    await expect(Effect.runPromise(readSignals(request, CounterSignals))).resolves.toEqual({ count: 2 })
  })

  it("rejects invalid signal payloads", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: "not-a-number" })
    })

    await expect(Effect.runPromise(readSignals(request, CounterSignals))).rejects.toBeTruthy()
  })

  it("builds text/event-stream Response objects", async () => {
    const response = patchSignalsResponse({ count: 42 })

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":42}\n\n')
  })
})
