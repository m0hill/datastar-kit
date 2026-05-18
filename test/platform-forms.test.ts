import * as NodeServices from "@effect/platform-node/NodeServices"
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import { describe, expect, it } from "vitest"
import {
  platformReadFormFromRequest,
  platformReadMultipartFromRequest,
  platformReadSignalsFromRequest,
  platformReadUrlEncodedFormFromRequest
} from "../src/platform.js"

const nativeRequest = (body: BodyInit, contentType?: string): HttpServerRequest.HttpServerRequest =>
  HttpServerRequest.fromWeb(
    new Request("http://localhost/submit", {
      method: "POST",
      ...(contentType === undefined ? {} : { headers: { "content-type": contentType } }),
      body
    })
  )

describe("native form decoding", () => {
  it("decodes URL-encoded form bodies with Effect Schema", async () => {
    const Form = Schema.Struct({
      name: Schema.String,
      age: Schema.FiniteFromString,
      tag: Schema.Array(Schema.String)
    })
    const request = nativeRequest(
      "name=Ada&age=37&tag=effect&tag=datastar",
      "application/x-www-form-urlencoded"
    )

    await expect(Effect.runPromise(platformReadUrlEncodedFormFromRequest(request, Form))).resolves.toEqual({
      name: "Ada",
      age: 37,
      tag: ["effect", "datastar"]
    })
  })

  it("decodes multipart form fields through Effect Platform facilities", async () => {
    const Form = Schema.Struct({
      title: Schema.String,
      count: Schema.FiniteFromString
    })
    const body = new FormData()
    body.append("title", "Upload")
    body.append("count", "2")
    const request = nativeRequest(body)

    const decoded = await Effect.runPromise(
      platformReadFormFromRequest(request, Form).pipe(
        Effect.provide(NodeServices.layer),
        Effect.scoped
      )
    )

    expect(decoded).toEqual({ title: "Upload", count: 2 })
  })

  it("supports explicit multipart decoding when handlers require persisted multipart data", async () => {
    const MultipartForm = Schema.Struct({
      title: Schema.String
    })
    const body = new FormData()
    body.append("title", "Avatar")
    const request = nativeRequest(body)

    const decoded = await Effect.runPromise(
      platformReadMultipartFromRequest(request, MultipartForm).pipe(
        Effect.provide(NodeServices.layer),
        Effect.scoped
      )
    )

    expect(decoded).toEqual({ title: "Avatar" })
  })

  it("keeps Datastar JSON signals distinct from form fields", async () => {
    const Form = Schema.Struct({
      name: Schema.String,
      datastar: Schema.String
    })
    const formRequest = nativeRequest(
      `name=Ada&datastar=${encodeURIComponent('{"count":1}')}`,
      "application/x-www-form-urlencoded"
    )

    await expect(Effect.runPromise(platformReadUrlEncodedFormFromRequest(formRequest, Form))).resolves.toEqual({
      name: "Ada",
      datastar: '{"count":1}'
    })

    const SignalBody = Schema.Struct({ count: Schema.Number })
    const signalRequest = nativeRequest(
      `name=Ada&datastar=${encodeURIComponent('{"count":1}')}`,
      "application/x-www-form-urlencoded"
    )
    const signals = await Effect.runPromise(Effect.result(platformReadSignalsFromRequest(signalRequest, SignalBody)))

    expect(Result.isFailure(signals)).toBe(true)
  })
})
