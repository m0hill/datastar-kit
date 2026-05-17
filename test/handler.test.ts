import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import { dataSignals, mergeAttrs, on, post, signal, text } from "../src/datastar.js"
import { route, router, textResponse, withSignals } from "../src/handler.js"
import { h, render } from "../src/html.js"
import { htmlResponse, patchSignalsResponse } from "../src/response.js"

const CounterSignals = Schema.Struct({
  count: Schema.Number
})

const view = () => {
  const count = signal<number, "count">("count")
  return render(
    h(
      "main",
      mergeAttrs({ id: "counter" }, dataSignals({ count: 0 }, { ifMissing: true })),
      h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
      h("output", text(count), "0")
    )
  )
}

describe("Effect handlers and exact router", () => {
  it("withSignals decodes Datastar payloads before running a handler", async () => {
    const increment = withSignals(CounterSignals, (signals) => Effect.succeed(patchSignalsResponse({ count: signals.count + 1 })))

    const response = await Effect.runPromise(
      increment(new Request("http://localhost/increment", { method: "POST", body: JSON.stringify({ count: 10 }) }))
    )

    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":11}\n\n')
  })

  it("routes exact method and path matches", async () => {
    const app = router(route("GET", "/", () => Effect.succeed(textResponse("ok"))))
    const response = await Effect.runPromise(app(new Request("http://localhost/")))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("ok")
  })

  it("returns 404 for unknown paths", async () => {
    const app = router(route("GET", "/", () => Effect.succeed(textResponse("ok"))))
    const response = await Effect.runPromise(app(new Request("http://localhost/missing")))

    expect(response.status).toBe(404)
  })

  it("returns 405 with Allow for wrong methods on known paths", async () => {
    const app = router(route("GET", "/", () => Effect.succeed(textResponse("ok"))))
    const response = await Effect.runPromise(app(new Request("http://localhost/", { method: "POST" })))

    expect(response.status).toBe(405)
    expect(response.headers.get("allow")).toBe("GET")
  })

  it("serves a Datastar HTML shell from a plain Effect handler", async () => {
    const app = router(route("GET", "/", () => Effect.succeed(htmlResponse(view()))))
    const response = await Effect.runPromise(app(new Request("http://localhost/")))

    expect(response.headers.get("content-type")).toContain("text/html")
    expect(await response.text()).toContain('data-on:click="@post(&quot;/increment&quot;)"')
  })
})
