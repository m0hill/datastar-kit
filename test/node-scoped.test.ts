import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { route, router, textResponse } from "../src/handler.js"
import { serveScoped, serverOrigin } from "../src/node.js"

describe("scoped Node server helper", () => {
  it("serves within an Effect scope", async () => {
    const app = router(route("GET", "/", () => Effect.succeed(textResponse("scoped"))))
    const body = await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const server = yield* serveScoped(app)
          const response = yield* Effect.promise(() => fetch(serverOrigin(server)))
          return yield* Effect.promise(() => response.text())
        })
      )
    )

    expect(body).toBe("scoped")
  })
})
