import { Effect, Layer, Schema } from "effect"
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http"
import { describe, expect, it } from "vitest"
import { read } from "../src/index.js"

const Signup = Schema.Struct({
  email: Schema.String.check(Schema.isPattern(/@/, { message: "Enter a valid email" })),
  address: Schema.Struct({ city: Schema.NonEmptyString })
})

// Runs one route through `HttpRouter.toWebHandler`, the same path an Effect app takes on Workers.
const serve = <R extends HttpRouter.HttpRouter | HttpRouter.Request<"Error", unknown>>(
  route: Layer.Layer<never, never, R>
) => HttpRouter.toWebHandler(route, { disableLogger: true }).handler

// Answers with the decoded signals as JSON, or with the error tag and its grouped messages.
const decodeRoute = (method: "GET" | "POST") =>
  HttpRouter.add(
    method,
    "/signup",
    read.decode(Signup).pipe(
      Effect.map((value) => HttpServerResponse.jsonUnsafe({ value })),
      Effect.catchTags({
        SchemaError: (error) =>
          Effect.succeed(HttpServerResponse.jsonUnsafe({ errors: read.flattenError(error) })),
        SignalReadError: (error) =>
          Effect.succeed(HttpServerResponse.text(error.cause.message, { status: 400 }))
      })
    )
  )

const valid = { email: "ada@example.com", address: { city: "London" } }

describe("read.decode", () => {
  it("decodes signals from the datastar query parameter of a GET", async () => {
    const handler = serve(decodeRoute("GET"))
    const query = new URLSearchParams({ datastar: JSON.stringify(valid) })
    const response = await handler(new Request(`http://localhost/signup?${query}`))

    expect(await response.json()).toEqual({ value: valid })
  })

  it("reports every invalid field, grouped by dot path", async () => {
    const handler = serve(decodeRoute("POST"))
    const response = await handler(
      new Request("http://localhost/signup", {
        method: "POST",
        body: JSON.stringify({ email: "ada", address: { city: "" } })
      })
    )

    expect(await response.json()).toEqual({
      errors: {
        form: [],
        fields: {
          email: ["Enter a valid email"],
          "address.city": [expect.any(String)]
        }
      }
    })
  })

  it("fails with SignalReadError carrying datastar-kit's parse error when the payload is not JSON", async () => {
    const handler = serve(decodeRoute("POST"))
    const response = await handler(
      new Request("http://localhost/signup", { method: "POST", body: "not json" })
    )

    expect(response.status).toBe(400)
    expect(await response.text()).toBe("Invalid Datastar signal JSON")
  })

  it("reads a body that something else already read", async () => {
    const handler = serve(
      HttpRouter.add(
        "POST",
        "/signup",
        Effect.gen(function* () {
          const request = yield* HttpServerRequest.HttpServerRequest
          const text = yield* request.text
          const raw = yield* read.signals
          const decoded = yield* read.decode(Signup)
          return HttpServerResponse.jsonUnsafe({ text, raw, decoded })
        })
      )
    )
    const body = JSON.stringify(valid)
    const response = await handler(new Request("http://localhost/signup", { method: "POST", body }))

    expect(await response.json()).toEqual({ text: body, raw: valid, decoded: valid })
  })
})
