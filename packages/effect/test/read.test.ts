import { Effect, Layer, Schema } from "effect"
import { HttpRouter, HttpServerResponse } from "effect/http"
import { describe, expect, it } from "vitest"
import { read } from "../src/index.js"

const Signup = Schema.Struct({
  email: Schema.String.check(Schema.isPattern(/@/, { message: "Enter a valid email" })),
  address: Schema.Struct({ city: Schema.NonEmptyString })
})

// Runs one route through `HttpRouter.toWebHandler`, the same path an Effect app takes on Workers.
const serve = (route: Layer.Layer<never, never, HttpRouter.HttpRouter>) =>
  HttpRouter.toWebHandler(route, { disableLogger: true }).handler

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
        SignalReadError: () =>
          Effect.succeed(HttpServerResponse.text("unreadable", { status: 400 }))
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

  it("fails with SignalReadError when the payload is not JSON", async () => {
    const handler = serve(decodeRoute("POST"))
    const response = await handler(
      new Request("http://localhost/signup", { method: "POST", body: "not json" })
    )

    expect(response.status).toBe(400)
  })
})
