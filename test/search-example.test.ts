import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { app, resultsView, searchPage, searchView } from "../examples/search.js"
import * as ds from "../src/ds.js"
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

describe("search example", () => {
  it("supports dynamic Datastar action URLs", () => {
    const q = ds.signal<string, "q">("q")

    expect(ds.get(ds.queryUrl("/search", { q })).toDatastarExpression()).toBe("@get(`/search?q=${encodeURIComponent($q)}`)")
  })

  it("renders a search shell with debounced Datastar requests", () => {
    expect(searchView()).toContain('data-on:input__debounce.200ms="@get(`/search?q=${encodeURIComponent($q)}`)"')
  })

  it("returns a native search page that loads the Datastar client", async () => {
    const html = await HttpServerResponse.toWeb(searchPage()).text()

    expect(html).toContain("<!doctype html>")
    expect(html).toContain('<script type="module" src="/datastar.js"></script>')
    expect(html).toContain('id="search"')
  })

  it("renders filtered result rows and empty states", () => {
    expect(resultsView("ada")).toBe('<tbody id="results"><tr><td>Ada</td><td>Lovelace</td></tr></tbody>')
    expect(resultsView("nobody")).toBe('<tbody id="results"><tr><td colspan="2">No contacts found</td></tr></tbody>')
  })

  it("dispatches the native example app", async () => {
    const listener = await makePlatformListener(app)
    const origin = await serveListener(listener)
    const response = await fetch(`${origin}/search?q=grace`)

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe(
      'event: datastar-patch-elements\ndata: selector #results\ndata: elements <tbody id="results"><tr><td>Grace</td><td>Hopper</td></tr></tbody>\n\n'
    )
  })
})
