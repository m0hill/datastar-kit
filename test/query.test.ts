import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import { describe, expect, it } from "vitest"
import { platformQueryFromRequest, platformReadQueryFromRequest } from "../src/platform.js"

const SearchQuery = Schema.Struct({
  q: Schema.String,
  page: Schema.FiniteFromString
})

const RepeatedQuery = Schema.Struct({
  tag: Schema.Array(Schema.String)
})

const nativeRequest = (url: string): HttpServerRequest.HttpServerRequest =>
  HttpServerRequest.fromWeb(new Request(url))

describe("native query decoding", () => {
  it("collects query parameters into a plain object", () => {
    expect(platformQueryFromRequest(nativeRequest("http://localhost/search?q=ada&page=2"))).toEqual({ q: "ada", page: "2" })
  })

  it("preserves repeated query parameters as arrays", () => {
    expect(platformQueryFromRequest(nativeRequest("http://localhost/search?tag=effect&tag=datastar"))).toEqual({
      tag: ["effect", "datastar"]
    })
  })

  it("decodes query parameters with Effect Schema", async () => {
    const request = nativeRequest("http://localhost/search?q=ada&page=2")

    await expect(Effect.runPromise(platformReadQueryFromRequest(request, SearchQuery))).resolves.toEqual({ q: "ada", page: 2 })
  })

  it("decodes repeated query parameters with Effect Schema", async () => {
    const request = nativeRequest("http://localhost/search?tag=effect&tag=datastar")

    await expect(Effect.runPromise(platformReadQueryFromRequest(request, RepeatedQuery))).resolves.toEqual({
      tag: ["effect", "datastar"]
    })
  })

  it("reports schema failures for invalid query values", async () => {
    const request = nativeRequest("http://localhost/search?q=ada&page=nope")
    const result = await Effect.runPromise(Effect.result(platformReadQueryFromRequest(request, SearchQuery)))

    expect(Result.isFailure(result)).toBe(true)
  })
})
