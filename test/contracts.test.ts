import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import { defineQueryAction, defineSignals } from "../src/contracts.js"
import { h } from "../src/html.js"
import { DatastarProtocol, requestRuntimeLayer, SignalDecoder } from "../src/runtime.js"

const Counter = defineSignals(
  "Counter",
  Schema.Struct({
    count: Schema.Number,
    draft: Schema.String,
    nested: Schema.Struct({ enabled: Schema.Boolean })
  })
)

const Search = defineQueryAction({
  name: "search",
  method: "get",
  path: "/search",
  querySchema: Schema.Struct({
    q: Schema.String,
    page: Schema.FiniteFromString
  })
})

if (false) {
  // @ts-expect-error Initial signals must match the schema-derived shape.
  Counter.initial({ count: 0, draft: "" })
  // @ts-expect-error Signal patches must use schema-compatible value types.
  Counter.patch({ count: "wrong" })
  // @ts-expect-error Unknown signal handles are not exposed by the contract.
  Counter.signals.missing
  // @ts-expect-error Query actions require all schema-derived query keys.
  Search.actionWithQuery({ q: "ada" })
  // @ts-expect-error Query actions reject unknown query keys.
  Search.actionWithQuery({ q: "ada", page: 1, extra: "nope" })
}

const nativeRequest = (url: string, body?: BodyInit): HttpServerRequest.HttpServerRequest =>
  HttpServerRequest.fromWeb(new Request(url, body === undefined ? undefined : { method: "POST", body }))

describe("end-to-end type contracts", () => {
  it("derives signal handles and initial signal attributes from one schema", () => {
    const s = Counter.signals

    expect(s.count.toDatastarExpression()).toBe("$count")
    expect(s.nested.path("enabled").toDatastarExpression()).toBe("$nested.enabled")
    expect(Counter.initial({ count: 0, draft: "", nested: { enabled: false } }, { ifMissing: true })).toEqual({
      "data-signals__ifmissing": '{"count": 0, "draft": "", "nested": {"enabled": false}}'
    })
  })

  it("derives typed signal patches and Datastar patch responses", async () => {
    const patch = Counter.patch({
      count: 2,
      nested: { enabled: true },
      draft: null
    })
    const response = HttpServerResponse.toWeb(Counter.patchResponse(patch))

    expect(patch).toEqual({ count: 2, nested: { enabled: true }, draft: null })
    expect(await response.text()).toBe(
      'event: datastar-patch-signals\ndata: signals {"count":2,"nested":{"enabled":true},"draft":null}\n\n'
    )
  })

  it("uses the same signal schema for request boundary decoding", async () => {
    const request = nativeRequest("http://localhost/increment", JSON.stringify({ count: 1, draft: "Ada", nested: { enabled: true } }))

    await expect(Effect.runPromise(Counter.readFromRequest(request))).resolves.toEqual({
      count: 1,
      draft: "Ada",
      nested: { enabled: true }
    })

    const bad = nativeRequest("http://localhost/increment", JSON.stringify({ count: "bad", draft: "Ada", nested: { enabled: true } }))
    const result = await Effect.runPromise(Effect.result(Counter.readFromRequest(bad)))

    expect(Result.isFailure(result)).toBe(true)
  })

  it("can decode contract signals through the Effect-native request runtime", async () => {
    const request = nativeRequest("http://localhost/increment", JSON.stringify({ count: 3, draft: "Grace", nested: { enabled: false } }))

    const decoded = await Effect.runPromise(
      Effect.gen(function*() {
        const decoder = yield* SignalDecoder
        const signals = yield* Counter.decode(decoder)
        const protocol = yield* DatastarProtocol
        const response = yield* protocol.patchElements(h("output", {}, signals.count))
        return { signals, response }
      }).pipe(
        Effect.provide(requestRuntimeLayer(), { local: true }),
        Effect.provideService(HttpServerRequest.HttpServerRequest, request)
      )
    )

    expect(decoded.signals.count).toBe(3)
    await expect(HttpServerResponse.toWeb(decoded.response).text()).resolves.toContain("<output>3</output>")
  })

  it("ties query schemas to action URL helpers and route-side decoding", async () => {
    expect(Search.url({ q: "ada", page: 2 }).toDatastarExpression()).toBe(
      "`/search?q=${encodeURIComponent(\"ada\")}&page=${encodeURIComponent(2)}`"
    )
    expect(Search.actionWithQuery({ q: "ada", page: 2 }).toDatastarExpression()).toBe(
      "@get(`/search?q=${encodeURIComponent(\"ada\")}&page=${encodeURIComponent(2)}`)"
    )

    const request = nativeRequest("http://localhost/search?q=ada&page=2")
    await expect(Effect.runPromise(Search.readQueryFromRequest(request))).resolves.toEqual({ q: "ada", page: 2 })
  })
})
