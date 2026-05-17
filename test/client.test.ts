import * as Effect from "effect/Effect"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import {
  DATASTAR_CDN,
  datastarClientFileRoute,
  datastarClientResponse,
  datastarClientRoute,
  datastarScript
} from "../src/client.js"
import { router } from "../src/handler.js"
import { render } from "../src/html.js"

const datastarJsPath = resolve("..", "datastar.js")

describe("Datastar client asset helpers", () => {
  it("renders the default self-hosted Datastar script tag", () => {
    expect(render(datastarScript())).toBe('<script type="module" src="/datastar.js"></script>')
  })

  it("can render a CDN Datastar script tag", () => {
    expect(render(datastarScript(DATASTAR_CDN))).toBe(`<script type="module" src="${DATASTAR_CDN}"></script>`)
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

  it("can serve the included minified datastar.js file", async () => {
    const expected = readFileSync(datastarJsPath, "utf8")
    const app = router(datastarClientFileRoute(datastarJsPath))
    const response = await Effect.runPromise(app(new Request("http://localhost/datastar.js")))

    expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8")
    expect(await response.text()).toBe(expected)
  })
})
