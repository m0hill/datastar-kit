import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import type { Handler } from "../src/index.js"
import { Handlers, route, textResponse } from "../src/index.js"

if (false) {
  const handlerFromIndex: Handler = () => Effect.succeed(new Response())
  void handlerFromIndex
}

describe("public index exports", () => {
  it("exports Handler as a type without namespace collision", () => {
    const handler: Handler = () => Effect.succeed(textResponse("ok"))

    expect(typeof handler).toBe("function")
  })

  it("exports handler helpers through a plural namespace", () => {
    expect(Handlers.route).toBe(route)
  })
})
