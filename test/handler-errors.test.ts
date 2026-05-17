import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import { mapErrorResponse, route, router, textResponse, withSignals } from "../src/handler.js"
import { patchSignalsResponse } from "../src/response.js"

const CounterSignals = Schema.Struct({
  count: Schema.Number
})

describe("handler error mapping", () => {
  it("maps typed handler failures to responses", async () => {
    const fail = mapErrorResponse(
      () => Effect.fail("nope"),
      (error) => textResponse(`handled ${error}`, { status: 400 })
    )

    const response = await Effect.runPromise(fail(new Request("http://localhost")))

    expect(response.status).toBe(400)
    expect(await response.text()).toBe("handled nope")
  })

  it("can turn signal decode failures into 400 responses", async () => {
    const increment = withSignals(CounterSignals, (signals) => Effect.succeed(patchSignalsResponse({ count: signals.count + 1 })))
    const safeIncrement = mapErrorResponse(increment, () => textResponse("Bad signals", { status: 400 }))
    const response = await Effect.runPromise(
      safeIncrement(new Request("http://localhost/increment", { method: "POST", body: JSON.stringify({ count: "bad" }) }))
    )

    expect(response.status).toBe(400)
    expect(await response.text()).toBe("Bad signals")
  })

  it("composes with exact routing", async () => {
    const app = router(route("GET", "/boom", mapErrorResponse(() => Effect.fail("boom"), () => textResponse("mapped", { status: 418 }))))
    const response = await Effect.runPromise(app(new Request("http://localhost/boom")))

    expect(response.status).toBe(418)
    expect(await response.text()).toBe("mapped")
  })
})
