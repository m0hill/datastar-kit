import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { CounterButton, tsxCounterApp, tsxCounterNode, tsxCounterPage, tsxCounterView } from "../examples/tsx-counter.js"
import { render } from "../src/html.js"
import { closePlatformListeners, makePlatformListener } from "./platform-listener.js"

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

describe("TSX counter example", () => {
  it("builds the counter view with TSX instead of hyperscript calls", () => {
    expect(tsxCounterView()).toBe(
      '<main id="tsx-counter" class="counter-shell" data-signals__ifmissing="{&quot;count&quot;: 0}"><h1>ts-star TSX counter</h1><button type="button" data-on:click="@post(&quot;/increment&quot;)">+</button><output data-text="$count">0</output></main>'
    )
  })

  it("keeps TSX output compatible with the shared HTML renderer", () => {
    expect(render(tsxCounterNode())).toContain('<output data-text="$count">0</output>')
  })

  it("uses a reusable typed TSX button component", () => {
    expect(render(CounterButton({ action: "/save", children: "Save" }))).toBe(
      '<button type="button" data-on:click="@post(&quot;/save&quot;)">Save</button>'
    )
  })

  it("returns a native page that loads the Datastar client", async () => {
    const html = await HttpServerResponse.toWeb(tsxCounterPage()).text()

    expect(html).toContain("<!doctype html>")
    expect(html).toContain('<script type="module" src="/datastar.js"></script>')
    expect(html).toContain("ts-star TSX counter")
  })

  it("dispatches TSX example app routes", async () => {
    const listener = await makePlatformListener(tsxCounterApp)
    const origin = await serveListener(listener)
    const pageResponse = await fetch(origin)
    const incrementResponse = await fetch(`${origin}/increment`, {
      method: "POST",
      body: JSON.stringify({ count: 4 })
    })

    expect(pageResponse.status).toBe(200)
    expect(await pageResponse.text()).toContain('id="tsx-counter"')
    expect(await incrementResponse.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":5}\n\n')
  })
})
