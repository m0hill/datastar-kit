import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { describe, expect, it } from "vitest"
import * as contract from "../src/contract.js"
import * as read from "../src/read.js"
import * as reply from "../src/reply.js"

const Counter = contract.signals(
  Schema.Struct({
    count: Schema.Number,
    draft: Schema.String,
    nested: Schema.Struct({ enabled: Schema.Boolean })
  })
)

if (false) {
  // @ts-expect-error Initial signals must match the schema-derived shape.
  Counter.initial({ count: 0, draft: "" })
  // @ts-expect-error Signal patches must use schema-compatible value types.
  Counter.patch({ count: "wrong" })
  // @ts-expect-error Unknown signal handles are not exposed by the contract.
  Counter.$.missing

  type CounterPatch = contract.Patch<typeof Counter>
  const _validPatch: CounterPatch = { count: 1, nested: { enabled: false } }

  type RawPatch = contract.Patch<{ readonly count: number }>
  // @ts-expect-error Patch only accepts a contract instance type.
  const _rawPatch: RawPatch = { count: 1 }
}

const nativeRequest = (url: string, body?: BodyInit): HttpServerRequest.HttpServerRequest =>
  HttpServerRequest.fromWeb(new Request(url, body === undefined ? undefined : { method: "POST", body }))

describe("schema-derived signal contracts", () => {
  it("derives signal refs and initial signal attributes from one schema", () => {
    const s = Counter.$

    expect(s.count.toDatastarExpression()).toBe("$count")
    expect(s.nested.path("enabled").toDatastarExpression()).toBe("$nested.enabled")
    expect(Counter.initial({ count: 0, draft: "", nested: { enabled: false } }, { ifMissing: true })).toEqual({
      "data-signals__ifmissing": '{"count": 0, "draft": "", "nested": {"enabled": false}}'
    })
  })

  it("derives typed signal patches without constructing responses", async () => {
    const patch: contract.Patch<typeof Counter> = Counter.patch({
      count: 2,
      nested: { enabled: true },
      draft: null
    })
    const response = HttpServerResponse.toWeb(reply.signals(patch))

    expect(patch).toEqual({ count: 2, nested: { enabled: true }, draft: null })
    expect(await response.text()).toBe(
      'event: datastar-patch-signals\ndata: signals {"count":2,"nested":{"enabled":true},"draft":null}\n\n'
    )
  })

  it("uses the contract schema explicitly at the request boundary", async () => {
    const request = nativeRequest("http://localhost/increment", JSON.stringify({ count: 1, draft: "Ada", nested: { enabled: true } }))

    await expect(
      Effect.runPromise(
        read.signals(Counter.schema).pipe(
          Effect.provideService(HttpServerRequest.HttpServerRequest, request)
        )
      )
    ).resolves.toEqual({
      count: 1,
      draft: "Ada",
      nested: { enabled: true }
    })

    const bad = nativeRequest("http://localhost/increment", JSON.stringify({ count: "bad", draft: "Ada", nested: { enabled: true } }))
    const result = await Effect.runPromise(
      Effect.result(read.signals(Counter.schema)).pipe(
        Effect.provideService(HttpServerRequest.HttpServerRequest, bad)
      )
    )

    expect(result._tag).toBe("Failure")
  })
})
