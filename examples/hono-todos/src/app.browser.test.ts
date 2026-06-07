import { chromium, type Page } from "playwright"
import { describe, expect, it, vi } from "vitest"
import {
  createDatastarBrowserTestServer,
  waitForDatastarBrowserRecorder,
  type DatastarBrowserTestServer
} from "datastar-kit/testing/node"

const browserFlagEnabled = (value: string | undefined): boolean => value === "1" || value === "true"
// Set DATASTAR_KIT_BROWSER_HEADED=1 or PWDEBUG=1 to watch this test run.
const debugBrowser = browserFlagEnabled(process.env.PWDEBUG)
const headedBrowser = browserFlagEnabled(process.env.DATASTAR_KIT_BROWSER_HEADED) || debugBrowser

type VisibleTodoState = {
  readonly title: string
  readonly count: string
  readonly error: string
}

const loadApp = async () => {
  vi.resetModules()
  return (await import("./app.js")).app
}

const startBrowserFixture = async (): Promise<DatastarBrowserTestServer> => {
  const app = await loadApp()

  return createDatastarBrowserTestServer({
    fetch: (request) => app.fetch(request)
  })
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

describe("Hono todos browser integration", () => {
  it("records the real Datastar runtime from user event to DOM patch", async () => {
    const fixture = await startBrowserFixture()
    const browser = await chromium.launch({
      headless: !headedBrowser,
      ...(debugBrowser ? { devtools: true } : {})
    })
    const page = await browser.newPage()

    try {
      await page.goto(fixture.url)
      await waitForDatastarBrowserRecorder(page)
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

      const flightAssertions = await fixture.assert(page)
      const serverAssertions = fixture.recorder.assert()

      flightAssertions.toHaveBrowserUserEvent({
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
      flightAssertions.toHaveBrowserSignalPatch({ errors: { title: "Enter a todo title." } })
      flightAssertions.toHaveDomMutation()
      serverAssertions.toHaveNoSignalErrors()
      flightAssertions.toHaveNoSignalErrors()
    } finally {
      await Promise.all([browser.close(), fixture.close()])
    }
  }, 35_000)
})
