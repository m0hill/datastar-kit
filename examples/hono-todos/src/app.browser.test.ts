import { readFile } from "node:fs/promises"
import { serve, type ServerType } from "@hono/node-server"
import { Hono } from "hono"
import { chromium, type Page } from "playwright"
import { ModuleKind, ScriptTarget, transpileModule } from "typescript"
import { describe, expect, it, vi } from "vitest"
import {
  assertDatastarFlight,
  createDatastarFlightRecorder,
  injectDatastarBrowserRecorder,
  type DatastarFlight,
  type DatastarFlightRecorder
} from "datastar-kit/testing"

const browserFlagEnabled = (value: string | undefined): boolean => value === "1" || value === "true"
// Set DATASTAR_KIT_BROWSER_HEADED=1 or PWDEBUG=1 to watch this test run.
const debugBrowser = browserFlagEnabled(process.env.PWDEBUG)
const headedBrowser = browserFlagEnabled(process.env.DATASTAR_KIT_BROWSER_HEADED) || debugBrowser

const datastarKitBrowserModules = new Set(["read", "testing"])

type VisibleTodoState = {
  readonly title: string
  readonly count: string
  readonly error: string
}

const loadApp = async (): Promise<Hono> => {
  vi.resetModules()
  return (await import("./app.js")).app
}

const datastarKitBrowserModule = async (fileName: string): Promise<Response> => {
  if (!fileName.endsWith(".js")) return new Response("Not Found", { status: 404 })

  const moduleName = fileName.slice(0, -".js".length)
  if (!datastarKitBrowserModules.has(moduleName)) {
    return new Response("Not Found", { status: 404 })
  }

  const source = await readFile(
    new URL(`../../../packages/datastar-kit/src/${moduleName}.ts`, import.meta.url),
    "utf8"
  )
  const { outputText } = transpileModule(source, {
    compilerOptions: {
      module: ModuleKind.ES2022,
      target: ScriptTarget.ES2022
    }
  })

  return new Response(outputText, {
    headers: { "content-type": "text/javascript; charset=utf-8" }
  })
}

const startBrowserFixture = async (): Promise<{
  readonly recorder: DatastarFlightRecorder
  readonly server: ServerType
  readonly url: string
}> => {
  const app = await loadApp()
  const fixture = new Hono()
  const recorder = createDatastarFlightRecorder()

  fixture.get("/__datastar-kit/:file", (c) => datastarKitBrowserModule(c.req.param("file")))
  fixture.all("*", async (c) => {
    const response = await recorder.handle(c.req.raw, (request) => app.fetch(request))
    const contentType = response.headers.get("content-type")
    const pathname = new URL(c.req.raw.url).pathname

    if (pathname === "/" && contentType?.includes("text/html")) {
      const headers = new Headers(response.headers)
      headers.delete("content-length")

      return new Response(
        injectDatastarBrowserRecorder(await response.text(), {
          module: "/__datastar-kit/testing.js",
          fetches: false
        }),
        {
          status: response.status,
          statusText: response.statusText,
          headers
        }
      )
    }

    return response
  })

  const server = await new Promise<ServerType>((resolve) => {
    const running = serve({ fetch: fixture.fetch, hostname: "127.0.0.1", port: 0 }, () =>
      resolve(running)
    )
  })
  const address = server.address()
  if (typeof address !== "object" || address === null) {
    throw new Error("Expected Hono test server to listen on a TCP address")
  }

  return { recorder, server, url: `http://127.0.0.1:${address.port}` }
}

const closeServer = async (server: ServerType): Promise<void> => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  )
}

const waitForBrowserRecorder = async (page: Page): Promise<void> => {
  await page.waitForFunction("window.__datastarKitFlightRecorder !== undefined")
}

const visibleTodoState = (page: Page): Promise<VisibleTodoState> =>
  page.evaluate(() => ({
    title: document.querySelector("#todo-1 span")?.textContent?.trim() ?? "",
    count: document.querySelector("#todo-count")?.textContent?.trim() ?? "",
    error: document.querySelector("#title-error")?.textContent?.trim() ?? ""
  }))

const expectVisibleTodoState = async (page: Page, expected: VisibleTodoState): Promise<void> => {
  expect(await visibleTodoState(page)).toEqual(expected)
}

const recordedBrowserFlight = async (page: Page): Promise<DatastarFlight> => {
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
  )
  await page.evaluate("window.__datastarKitFlightRecorder.flush()")
  return page.evaluate("window.__datastarKitFlightRecorder.recorder.flight()")
}

describe("Hono todos browser integration", () => {
  it("records the real Datastar runtime from user event to DOM patch", async () => {
    const { recorder: serverRecorder, server, url } = await startBrowserFixture()
    const browser = await chromium.launch({
      headless: !headedBrowser,
      ...(debugBrowser ? { devtools: true } : {})
    })
    const page = await browser.newPage()

    try {
      await page.goto(url)
      await waitForBrowserRecorder(page)
      await page.getByText("No todos yet.").waitFor()

      await page.getByRole("button", { name: "Add todo" }).click()
      await page.getByText("Enter a todo title.").waitFor()
      await page.getByLabel("New todo").fill("Write browser integration")
      await page.getByRole("button", { name: "Add todo" }).click()
      await page.getByText("Write browser integration").waitFor()
      await page.getByText("1 of 1 remaining").waitFor()

      await expectVisibleTodoState(page, {
        title: "Write browser integration",
        count: "1 of 1 remaining",
        error: ""
      })

      const browserAssertions = assertDatastarFlight(await recordedBrowserFlight(page))
      const serverAssertions = serverRecorder.assert()

      browserAssertions.toHaveBrowserUserEvent({
        event: "submit",
        target: "form#todo-form",
        datastarAttribute: "data-on:submit__prevent",
        expression: /@post\("\/todos"\)/
      })
      serverAssertions.toHaveRequested({
        method: "POST",
        url: /\/todos$/,
        signals: { title: "" }
      })
      serverAssertions.toHavePatchedSignals({ errors: { title: "Enter a todo title." } })
      serverAssertions.toHaveRequested({
        method: "POST",
        url: /\/todos$/,
        signals: { title: "Write browser integration" }
      })
      serverAssertions.toHavePatchedSignals({ title: "", errors: { title: "" } })
      serverAssertions.toHavePatchedElements({
        elements: /Write browser integration[\s\S]*1 of 1 remaining/,
        mode: "outer",
        namespace: "html"
      })
      browserAssertions.toHaveBrowserSignalPatch({ errors: { title: "Enter a todo title." } })
      browserAssertions.toHaveDomMutation()
      serverAssertions.toHaveNoSignalErrors()
      browserAssertions.toHaveNoSignalErrors()
    } finally {
      await Promise.all([browser.close(), closeServer(server)])
    }
  }, 35_000)
})
