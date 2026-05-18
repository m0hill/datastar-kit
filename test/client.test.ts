import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { readFileSync } from "node:fs"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { resolve } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  datastarClientFileRoute,
  datastarClientFileRoutes,
  datastarClientResponse,
  datastarClientRoute,
  datastarClientRoutes,
  datastarDocument,
  datastarPageResponse,
  datastarScript
} from "../src/client.js"
import { h, render } from "../src/html.js"
import { platformRouter } from "../src/platform.js"
import { closePlatformListeners, makePlatformListener } from "./platform-listener.js"

const datastarJsPath = resolve("vendor", "datastar.js")
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

describe("Datastar client asset helpers", () => {
  it("renders the default self-hosted Datastar script tag", () => {
    expect(render(datastarScript())).toBe('<script type="module" src="/datastar.js"></script>')
  })

  it("can render a caller-provided external Datastar script tag", () => {
    const externalScript = "https://example.com/datastar.js"

    expect(render(datastarScript(externalScript))).toBe(`<script type="module" src="${externalScript}"></script>`)
  })

  it("does not prescribe a Datastar CDN URL as framework API", async () => {
    const clientModule = await import("../src/client.js")

    expect("DATASTAR_CDN" in clientModule).toBe(false)
  })

  it("builds a full Datastar document around body content", () => {
    const externalScript = "https://example.com/datastar.js"

    expect(datastarDocument(h("main", {}, "Hello"), { lang: "en-US", scriptSrc: externalScript })).toBe(
      `<!doctype html><html lang="en-US"><head><script type="module" src="${externalScript}"></script></head><body><main>Hello</main></body></html>`
    )
  })

  it("builds Datastar page responses", async () => {
    const response = HttpServerResponse.toWeb(datastarPageResponse(h("main", {}, "Hello")))

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(await response.text()).toBe(
      '<!doctype html><html lang="en"><head><script type="module" src="/datastar.js"></script></head><body><main>Hello</main></body></html>'
    )
  })

  it("serves provided Datastar client content with configurable JavaScript cache headers", async () => {
    const response = HttpServerResponse.toWeb(datastarClientResponse("console.log('datastar')", {
      cacheControl: "public, max-age=31536000, immutable",
      headers: { etag: '"datastar-v1"' }
    }))

    expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8")
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable")
    expect(response.headers.get("etag")).toBe('"datastar-v1"')
    expect(await response.text()).toBe("console.log('datastar')")
  })

  it("creates a route for provided Datastar client content", async () => {
    const app = platformRouter(datastarClientRoute("export {}"))
    const listener = await makePlatformListener(app)
    const response = await fetch(`${await serveListener(listener)}/datastar.js`)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("export {}")
  })

  it("pairs app routes with a default Datastar client route", async () => {
    const app = platformRouter(
      ...datastarClientRoutes(
        "export const datastar = true",
        HttpRouter.route("GET", "/", datastarPageResponse(h("main", {}, "Ready")))
      )
    )
    const listener = await makePlatformListener(app)
    const origin = await serveListener(listener)

    const page = await fetch(`${origin}/`)
    const client = await fetch(`${origin}/datastar.js`)

    expect(await page.text()).toContain('<script type="module" src="/datastar.js"></script>')
    expect(client.headers.get("content-type")).toBe("text/javascript; charset=utf-8")
    expect(await client.text()).toBe("export const datastar = true")
  })

  it("can serve the included minified datastar.js file", async () => {
    const expected = readFileSync(datastarJsPath, "utf8")
    const app = platformRouter(datastarClientFileRoute(datastarJsPath))
    const listener = await makePlatformListener(app)
    const response = await fetch(`${await serveListener(listener)}/datastar.js`)

    expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8")
    expect(await response.text()).toBe(expected)
  })

  it("pairs app routes with a file-backed Datastar client route", async () => {
    const expected = readFileSync(datastarJsPath, "utf8")
    const app = platformRouter(
      ...datastarClientFileRoutes(
        datastarJsPath,
        HttpRouter.route("GET", "/", datastarPageResponse(h("main", {}, "Ready")))
      )
    )
    const listener = await makePlatformListener(app)
    const origin = await serveListener(listener)

    const page = await fetch(`${origin}/`)
    const client = await fetch(`${origin}/datastar.js`)

    expect(await page.text()).toContain('<script type="module" src="/datastar.js"></script>')
    expect(await client.text()).toBe(expected)
  })
})
