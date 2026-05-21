import { describe, expect, it } from "vitest"
import { z } from "zod"
import { dataSignals, on, post, signal, text } from "../src/ds/index.js"
import { h, mergeProps, renderToString } from "../src/html.js"
import * as read from "../src/read.js"
import * as reply from "../src/reply.js"

const CounterSignals = z.object({
  count: z.number()
})

const counterView = () => {
  const count = signal<number, "count">("count")

  return renderToString(
    h(
      "main",
      mergeProps({ id: "counter" }, dataSignals({ count: 0 }, { ifMissing: true })),
      h("button", mergeProps({ type: "button" }, on("click", post("/increment"))), "+"),
      h("output", text(count), "0")
    )
  )
}

const increment = async (request: Request): Promise<Response> => {
  const signals = await read.signals(request, CounterSignals)
  return reply.signals({ count: signals.count + 1 })
}

describe("minimal Web Standards vertical slice", () => {
  it("renders the server-driven counter shell", () => {
    expect(counterView()).toContain('data-on:click="@post(&quot;/increment&quot;)"')
    expect(counterView()).toContain('data-text="$count"')
  })

  it("handles an increment action by decoding signals and patching signals", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: 7 })
    })
    const response = await increment(request)

    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":8}\n\n')
  })
})
