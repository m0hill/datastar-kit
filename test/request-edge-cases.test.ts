import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import { isDatastarRequest, readSignals, rawSignalsFromRequest, SignalJsonError } from "../src/request.js"

const EmptySignals = Schema.Struct({})
const CounterSignals = Schema.Struct({
  count: Schema.Number
})

describe("Datastar request edge cases", () => {
  it("detects Datastar action request headers case-insensitively", () => {
    expect(isDatastarRequest(new Request("http://localhost", { headers: { "Datastar-Request": "true" } }))).toBe(true)
    expect(isDatastarRequest(new Request("http://localhost", { headers: { "Datastar-Request": "FALSE" } }))).toBe(false)
  })

  it("reads DELETE signals from the query string like GET", async () => {
    const request = new Request(`http://localhost/item?datastar=${encodeURIComponent(JSON.stringify({ count: 9 }))}`, {
      method: "DELETE"
    })

    await expect(Effect.runPromise(readSignals(request, CounterSignals))).resolves.toEqual({ count: 9 })
  })

  it("defaults empty non-GET bodies to an empty signal object", async () => {
    const request = new Request("http://localhost/save", { method: "POST" })

    await expect(Effect.runPromise(readSignals(request, EmptySignals))).resolves.toEqual({})
  })

  it("exposes raw signal payloads for custom decoders", async () => {
    const request = new Request("http://localhost/save", { method: "POST", body: '{"count":1}' })

    await expect(Effect.runPromise(rawSignalsFromRequest(request))).resolves.toBe('{"count":1}')
  })

  it("returns SignalJsonError for malformed JSON signal payloads", async () => {
    const request = new Request("http://localhost/save", { method: "POST", body: "{" })
    const result = await Effect.runPromise(Effect.result(readSignals(request, CounterSignals)))

    expect(Result.isFailure(result)).toBe(true)
    if (Result.isFailure(result)) {
      expect(result.failure).toBeInstanceOf(SignalJsonError)
    }
  })
})
