import { describe, expect, it } from "vitest"
import { z } from "zod"
import * as read from "../src/read.js"
import * as reply from "../src/reply.js"

const CounterSignals = z.object({
  count: z.number()
})

describe("Web Request signal decoding", () => {
  it("decodes POST Datastar signals from a Request", async () => {
    const request = new Request("http://localhost/increment", {
      method: "POST",
      body: JSON.stringify({ count: 9 })
    })

    const { count } = await read.signals(request, CounterSignals)
    const response = reply.signals({ count: count + 1 })

    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":10}\n\n')
  })

  it("decodes GET Datastar query signals", async () => {
    const request = new Request(`http://localhost/signals?datastar=${encodeURIComponent('{"count":3}')}`)
    const { count } = await read.signals(request, CounterSignals)
    const response = reply.directSignals({ count }, { onlyIfMissing: true })

    expect(response.headers.get("datastar-only-if-missing")).toBe("true")
    expect(await response.text()).toBe('{"count":3}')
  })

  it("lets handlers map signal decode failures to Datastar feedback", async () => {
    const request = new Request("http://localhost/signals", {
      method: "POST",
      body: JSON.stringify({ count: "bad" })
    })

    let ok = true
    try {
      await read.signals(request, CounterSignals)
    } catch (error) {
      if (error instanceof read.SignalValidationError) {
        ok = false
      } else {
        throw error
      }
    }

    expect(await reply.directSignals({ ok }).text()).toBe('{"ok":false}')
  })
})
