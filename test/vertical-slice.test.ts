import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { dataSignals, mergeAttrs, on, post, signal, text } from "../src/datastar.js"
import { h, render } from "../src/html.js"
import { platformPatchSignalsResponse, platformReadSignals, platformRouter } from "../src/platform.js"
import { closePlatformListeners, makePlatformListener } from "./platform-listener.js"

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

const increment = platformReadSignals(CounterSignals).pipe(
  Effect.map((signals) => platformPatchSignalsResponse({ count: signals.count + 1 }))
)

let server: Server | undefined

const serveListener = async (listener: RequestListener): Promise<string> => {
  server = createServer(listener)
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

afterEach(async () => {
  const current = server
  server = undefined
  if (current !== undefined) {
    await new Promise<void>((resolve, reject) => current.close((error) => error ? reject(error) : resolve()))
  }
  await closePlatformListeners()
})

describe("minimal native Effect vertical slice", () => {
  it("renders the server-driven counter shell", () => {
    expect(counterView()).toContain('data-on:click="@post(&quot;/increment&quot;)"')
    expect(counterView()).toContain('data-text="$count"')
  })

  it("handles an increment action by decoding signals and patching signals", async () => {
    const app = platformRouter(HttpRouter.route("POST", "/increment", increment))
    const listener = await makePlatformListener(app)
    const origin = await serveListener(listener)
    const response = await fetch(`${origin}/increment`, {
      method: "POST",
      body: JSON.stringify({ count: 7 })
    })

    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":8}\n\n')
  })
})
