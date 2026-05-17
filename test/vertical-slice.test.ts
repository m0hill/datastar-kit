import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { describe, expect, it } from "vitest"
import { dataSignals, mergeAttrs, on, post, signal, text } from "../src/datastar.js"
import { h, render } from "../src/html.js"
import { patchSignalsResponse } from "../src/response.js"
import { readSignals } from "../src/request.js"

const CounterSignals = Schema.Struct({
  count: Schema.Number
})

const counterView = () => {
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

const increment = (request: Request) =>
  Effect.gen(function* () {
    const signals = yield* readSignals(request, CounterSignals)
    return patchSignalsResponse({ count: signals.count + 1 })
  })

describe("minimal vertical slice", () => {
  it("renders the server-driven counter shell", () => {
    expect(counterView()).toContain('data-on:click="@post(&quot;/increment&quot;)"')
    expect(counterView()).toContain('data-text="$count"')
  })

  it("handles an increment action by decoding signals and patching signals", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: 7 })
    })

    const response = await Effect.runPromise(increment(request))

    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":8}\n\n')
  })
})
