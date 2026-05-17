import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { app, counterView, increment, page } from "../examples/counter.js"

describe("counter example", () => {
  it("renders a Datastar counter view", () => {
    expect(counterView()).toContain('data-signals__ifmissing="{&quot;count&quot;: 0}"')
    expect(counterView()).toContain('data-on:click="@post(&quot;/increment&quot;)"')
  })

  it("returns a page that loads the Datastar client", async () => {
    const response = page()

    expect(await response.text()).toContain('<script type="module" src="/datastar.js"></script>')
  })

  it("increments through the reusable action handler", async () => {
    const response = await Effect.runPromise(
      increment(new Request("http://localhost/increment", { method: "POST", body: JSON.stringify({ count: 12 }) }))
    )

    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":13}\n\n')
  })

  it("dispatches the example app routes", async () => {
    const response = await Effect.runPromise(app(new Request("http://localhost/")))

    expect(response.status).toBe(200)
    expect(await response.text()).toContain("ts-star counter")
  })
})
