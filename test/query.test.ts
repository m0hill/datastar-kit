import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import { queryFromRequest, readQuery } from "../src/request.js"

const SearchQuery = Schema.Struct({
  q: Schema.String,
  page: Schema.NumberFromString
})

const RepeatedQuery = Schema.Struct({
  tag: Schema.Array(Schema.String)
})

describe("query decoding", () => {
  it("collects query parameters into a plain object", () => {
    const request = new Request("http://localhost/search?q=ada&page=2")

    expect(queryFromRequest(request)).toEqual({ q: "ada", page: "2" })
  })

  it("preserves repeated query parameters as arrays", () => {
    const request = new Request("http://localhost/search?tag=effect&tag=datastar")

    expect(queryFromRequest(request)).toEqual({ tag: ["effect", "datastar"] })
  })

  it("decodes query parameters with Effect Schema", async () => {
    const request = new Request("http://localhost/search?q=ada&page=2")

    await expect(Effect.runPromise(readQuery(request, SearchQuery))).resolves.toEqual({ q: "ada", page: 2 })
  })

  it("decodes repeated query parameters with Effect Schema", async () => {
    const request = new Request("http://localhost/search?tag=effect&tag=datastar")

    await expect(Effect.runPromise(readQuery(request, RepeatedQuery))).resolves.toEqual({
      tag: ["effect", "datastar"]
    })
  })

  it("reports schema failures for invalid query values", async () => {
    const request = new Request("http://localhost/search?q=ada&page=nope")
    const result = await Effect.runPromise(Effect.either(readQuery(request, SearchQuery)))

    expect(result._tag).toBe("Left")
  })
})
