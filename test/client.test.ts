import * as Effect from "effect/Effect"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  DATASTAR_CDN,
  datastarClientFileRoute,
  datastarClientFileRoutes,
  datastarClientResponse,
  datastarClientRoute,
  datastarClientRoutes,
  datastarDocument,
  datastarPageResponse,
  datastarScript
} from "../src/client.js"
import { route, router } from "../src/handler.js"
import { h, render } from "../src/html.js"

const datastarJsPath = resolve("..", "datastar.js")

describe("Datastar client asset helpers", () => {
  it("renders the default self-hosted Datastar script tag", () => {
    expect(render(datastarScript())).toBe('<script type="module" src="/datastar.js"></script>')
  })

  it("can render a CDN Datastar script tag", () => {
    expect(render(datastarScript(DATASTAR_CDN))).toBe(`<script type="module" src="${DATASTAR_CDN}"></script>`)
  })

  it("builds a full Datastar document around body content", () => {
    expect(datastarDocument(h("main", {}, "Hello"), { lang: "en-US", scriptSrc: DATASTAR_CDN })).toBe(
      `<!doctype html><html lang="en-US"><head><script type="module" src="${DATASTAR_CDN}"></script></head><body><main>Hello</main></body></html>`
    )
  })

  it("builds Datastar page responses", async () => {
    const response = datastarPageResponse(h("main", {}, "Hello"))

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(await response.text()).toBe(
      '<!doctype html><html lang="en"><head><script type="module" src="/datastar.js"></script></head><body><main>Hello</main></body></html>'
    )
  })

  it("serves provided Datastar client content with JavaScript headers", async () => {
    const response = datastarClientResponse("console.log('datastar')", { cacheControl: "public, max-age=60" })

    expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8")
    expect(response.headers.get("cache-control")).toBe("public, max-age=60")
    expect(await response.text()).toBe("console.log('datastar')")
  })

  it("creates a route for provided Datastar client content", async () => {
    const app = router(datastarClientRoute("export {}"))
    const response = await Effect.runPromise(app(new Request("http://localhost/datastar.js")))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("export {}")
  })

  it("pairs app routes with a default Datastar client route", async () => {
    const app = router(
      ...datastarClientRoutes(
        "export const datastar = true",
        route("GET", "/", () => Effect.succeed(datastarPageResponse(h("main", {}, "Ready"))))
      )
    )

    const page = await Effect.runPromise(app(new Request("http://localhost/")))
    const client = await Effect.runPromise(app(new Request("http://localhost/datastar.js")))

    expect(await page.text()).toContain('<script type="module" src="/datastar.js"></script>')
    expect(client.headers.get("content-type")).toBe("text/javascript; charset=utf-8")
    expect(await client.text()).toBe("export const datastar = true")
  })

  it("can serve the included minified datastar.js file", async () => {
    const expected = readFileSync(datastarJsPath, "utf8")
    const app = router(datastarClientFileRoute(datastarJsPath))
    const response = await Effect.runPromise(app(new Request("http://localhost/datastar.js")))

    expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8")
    expect(await response.text()).toBe(expected)
  })

  it("pairs app routes with a file-backed Datastar client route", async () => {
    const expected = readFileSync(datastarJsPath, "utf8")
    const app = router(
      ...datastarClientFileRoutes(
        datastarJsPath,
        route("GET", "/", () => Effect.succeed(datastarPageResponse(h("main", {}, "Ready"))))
      )
    )

    const page = await Effect.runPromise(app(new Request("http://localhost/")))
    const client = await Effect.runPromise(app(new Request("http://localhost/datastar.js")))

    expect(await page.text()).toContain('<script type="module" src="/datastar.js"></script>')
    expect(await client.text()).toBe(expected)
  })
})
