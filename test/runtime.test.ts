import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import { describe, expect, it } from "vitest"
import * as read from "../src/read.js"

const CounterSignals = Schema.Struct({
  count: Schema.Number
})

const nativeRequest = (body: BodyInit, headers: HeadersInit = {}): HttpServerRequest.HttpServerRequest =>
  HttpServerRequest.fromWeb(new Request("http://localhost/increment?from=test", { method: "POST", headers, body }))

describe("request read helpers", () => {
  it("decodes Datastar signals through explicit read helpers", async () => {
    const request = nativeRequest(JSON.stringify({ count: 4 }), { "datastar-request": "true" })

    const result = await Effect.runPromise(
      read.signals(CounterSignals).pipe(
        Effect.provideService(HttpServerRequest.HttpServerRequest, request)
      )
    )

    expect(result).toEqual({ count: 4 })
  })

  it("supports explicit request variants", async () => {
    const request = nativeRequest(JSON.stringify({ count: 7 }))

    await expect(Effect.runPromise(read.signalsFrom(request, CounterSignals))).resolves.toEqual({ count: 7 })
  })

  it("surfaces decode failures in the error channel", async () => {
    const request = nativeRequest(JSON.stringify({ count: "bad" }))

    const result = await Effect.runPromise(
      Effect.result(read.signals(CounterSignals)).pipe(
        Effect.provideService(HttpServerRequest.HttpServerRequest, request)
      )
    )

    expect(Result.isFailure(result)).toBe(true)
  })

  it("decodes query params", async () => {
    const Query = Schema.Struct({
      from: Schema.String
    })
    const request = nativeRequest(JSON.stringify({ count: 1 }))

    const result = await Effect.runPromise(
      read.query(Query).pipe(
        Effect.provideService(HttpServerRequest.HttpServerRequest, request)
      )
    )

    expect(result).toEqual({ from: "test" })
  })
})
