import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import { describe, expect, it } from "vitest"
import * as read from "../src/read.js"

const CounterSignals = Schema.Struct({
  count: Schema.Number
})

const nativeRequest = (url: string, init?: RequestInit): HttpServerRequest.HttpServerRequest =>
  HttpServerRequest.fromWeb(new Request(url, init))

describe("request read helpers", () => {
  it("decodes body-based Datastar signals from the current request", async () => {
    const request = nativeRequest("http://localhost/increment", {
      method: "POST",
      headers: { "datastar-request": "true" },
      body: JSON.stringify({ count: 4 })
    })

    const result = await Effect.runPromise(
      read.signals(CounterSignals).pipe(
        Effect.provideService(HttpServerRequest.HttpServerRequest, request)
      )
    )

    expect(result).toEqual({ count: 4 })
  })

  it("decodes GET Datastar signals from the datastar query parameter", async () => {
    const request = nativeRequest(`http://localhost/signals?datastar=${encodeURIComponent('{"count":7}')}`)

    const result = await Effect.runPromise(
      read.signals(CounterSignals).pipe(
        Effect.provideService(HttpServerRequest.HttpServerRequest, request)
      )
    )

    expect(result).toEqual({ count: 7 })
  })

  it("surfaces schema failures in the error channel", async () => {
    const request = nativeRequest("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: "bad" })
    })

    const result = await Effect.runPromise(
      Effect.result(read.signals(CounterSignals)).pipe(
        Effect.provideService(HttpServerRequest.HttpServerRequest, request)
      )
    )

    expect(result._tag).toBe("Failure")
  })

  it("surfaces invalid JSON as a standard schema failure", async () => {
    const request = nativeRequest("http://localhost/increment", {
      method: "POST",
      body: "not json"
    })

    const result = await Effect.runPromise(
      Effect.result(read.signals(CounterSignals)).pipe(
        Effect.provideService(HttpServerRequest.HttpServerRequest, request)
      )
    )

    expect(result._tag).toBe("Failure")
  })
})
