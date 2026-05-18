import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { CounterButton, makeTsxCounter, tsxCounterNode, tsxCounterPage, tsxCounterView } from "../examples/tsx-counter.js"
import { render } from "../src/html.js"
import { closePlatformListeners, makePlatformListener } from "./platform-listener.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

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
      '<main id="tsx-counter" class="counter-shell"><h1>ts-star TSX counter</h1><button type="button" data-on:click="@post(&quot;/increment&quot;)">+</button><output id="count">0</output></main>'
    )
  })

  it("keeps TSX output compatible with the shared HTML renderer", () => {
    expect(render(tsxCounterNode())).toContain('<output id="count">0</output>')
  })

  it("uses a reusable typed TSX button component", () => {
    expect(render(CounterButton({ action: "/save", children: "Save" }))).toBe(
      '<button type="button" data-on:click="@post(&quot;/save&quot;)">Save</button>'
    )
  })

  it("returns a native page with an explicit Datastar client script", async () => {
    const html = await HttpServerResponse.toWeb(tsxCounterPage()).text()

    expect(html).toContain("<!doctype html>")
    expect(html).toContain(`<script type="module" src="${DATASTAR_CDN}"></script>`)
    expect(html).toContain("ts-star TSX counter")
  })

  it("dispatches TSX example app routes", async () => {
    const counter = makeTsxCounter()
    const listener = await makePlatformListener(counter.app)
    const origin = await serveListener(listener)
    const pageResponse = await fetch(origin)
    const incrementResponse = await fetch(`${origin}/increment`, { method: "POST" })

    expect(pageResponse.status).toBe(200)
    expect(await pageResponse.text()).toContain('id="tsx-counter"')
    expect(await incrementResponse.text()).toBe(
      'event: datastar-patch-elements\ndata: selector #count\ndata: elements <output id="count">1</output>\n\n'
    )
  })
})
