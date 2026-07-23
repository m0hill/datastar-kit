import { execFile as execFileCallback, spawnSync } from "node:child_process"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { fileURLToPath } from "node:url"
import { promisify } from "node:util"
import { build } from "esbuild"
import { describe, expect, it } from "vitest"
import { post, signal } from "../src/ds/index.js"
import { h, renderToString, unsafeHtml } from "../src/html.js"

const execFile = promisify(execFileCallback)
const agentBrowserAvailable =
  spawnSync("agent-browser", ["--version"], { stdio: "ignore" }).status === 0
const browserIt = agentBrowserAvailable ? it : it.skip
const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"
const DEBUGGER_AUTO_SCRIPT = "/datastar-kit-debugger.js"

const runtimePage = (): string => {
  const count = signal<number, "count">("count")

  return `<!doctype html>${renderToString(
    h(
      "html",
      { lang: "en" },
      h("head", {}, h("script", { type: "module", src: DATASTAR_RUNTIME })),
      h(
        "body",
        {},
        h(
          "main",
          { id: "app", "data-signals__ifmissing": '{"count": 0}' },
          h("output", { id: "count", "data-text": count.toDatastarExpression() }, "0"),
          h(
            "button",
            {
              id: "ignored",
              type: "button",
              "data-on:click": post("/ignored").toDatastarExpression()
            },
            "ignored"
          ),
          h(
            "button",
            {
              id: "increment",
              type: "button",
              "data-on:click": post("/increment").toDatastarExpression()
            },
            "+"
          )
        )
      )
    )
  )}`
}

const keyedPluginPage = (): string =>
  `<!doctype html>${renderToString(
    h(
      "html",
      { lang: "en" },
      h(
        "head",
        {},
        h("script", { type: "module", src: DATASTAR_RUNTIME }),
        h(
          "script",
          { type: "module" },
          unsafeHtml(`
          import { attribute } from "${DATASTAR_RUNTIME}"

          attribute({
            name: "keyed-check",
            requirement: { key: "must", value: "must" },
            returnsValue: true,
            apply({ el, key, rx }) {
              const value = rx()
              el.textContent = key + ":" + value
              window.__datastarKitKeyedPlugin = { key, value }
            }
          })
        `)
        )
      ),
      h(
        "body",
        {},
        h(
          "output",
          {
            id: "keyed-plugin",
            "data-keyed-check:item-name": JSON.stringify("from suffix")
          },
          "waiting"
        )
      )
    )
  )}`

const timeTravelPage = (): string => {
  const count = signal<number, "count">("count")

  return `<!doctype html>${renderToString(
    h(
      "html",
      { lang: "en" },
      h(
        "head",
        {},
        h("script", { type: "module", src: DEBUGGER_AUTO_SCRIPT }),
        h("script", { type: "module", src: DATASTAR_RUNTIME })
      ),
      h(
        "body",
        {},
        h(
          "main",
          { id: "app", "data-signals__ifmissing": '{"count": 0}' },
          h("output", { id: "count", "data-text": count.toDatastarExpression() }, "0"),
          h(
            "button",
            {
              id: "increment",
              type: "button",
              "data-on:click": post("/increment").toDatastarExpression()
            },
            "+"
          )
        )
      )
    )
  )}`
}

const buildDebuggerScript = async (): Promise<string> => {
  const result = await build({
    entryPoints: [fileURLToPath(new URL("../src/debugger/index.ts", import.meta.url))],
    bundle: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    write: false
  })
  const output = result.outputFiles[0]
  if (!output) throw new Error("Debugger browser bundle was not produced")
  return output.text
}

const serveTimeTravelFixture = async (): Promise<{
  readonly server: Server
  readonly url: string
}> => {
  let serverCount = 0
  const debuggerScript = await buildDebuggerScript()
  const server = createServer((request, response) => {
    if (request.url === DEBUGGER_AUTO_SCRIPT) {
      response.writeHead(200, { "content-type": "text/javascript; charset=utf-8" })
      response.end(debuggerScript)
      return
    }

    if (request.url === "/increment") {
      serverCount += 1
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" })
      response.end(JSON.stringify({ count: serverCount }))
      return
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
    response.end(timeTravelPage())
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address() as AddressInfo
  return { server, url: `http://127.0.0.1:${address.port}` }
}

const serveRuntimeFixture = async (): Promise<{
  readonly server: Server
  readonly url: string
}> => {
  const server = createServer((request, response) => {
    if (request.url === "/ignored") {
      response.writeHead(202, { "content-type": "application/json; charset=utf-8" })
      response.end(JSON.stringify({ count: 99 }))
      return
    }

    if (request.url === "/increment") {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8" })
      response.end(JSON.stringify({ count: 1 }))
      return
    }

    response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
    response.end(runtimePage())
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address() as AddressInfo
  return { server, url: `http://127.0.0.1:${address.port}` }
}

const serveKeyedPluginFixture = async (): Promise<{
  readonly server: Server
  readonly url: string
}> => {
  const server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" })
    response.end(keyedPluginPage())
  })

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address() as AddressInfo
  return { server, url: `http://127.0.0.1:${address.port}` }
}

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  )
}

const waitForSelector = async (
  browser: (...args: ReadonlyArray<string>) => Promise<string>,
  selector: string
): Promise<void> => {
  await browser(
    "eval",
    `(async () => {
      const deadline = Date.now() + 2000
      while (Date.now() < deadline && document.querySelector(${JSON.stringify(selector)}) === null) {
        await new Promise((resolve) => setTimeout(resolve, 25))
      }
      if (document.querySelector(${JSON.stringify(selector)}) === null) {
        throw new Error("Missing selector ${selector}")
      }
    })()`
  )
}

describe("Datastar browser runtime integration", () => {
  browserIt(
    "runs custom attribute plugins with keyed suffixes",
    async () => {
      const session = `datastar-kit-keyed-plugin-${process.pid}-${Date.now()}`
      const { server, url } = await serveKeyedPluginFixture()
      const browser = async (...args: ReadonlyArray<string>): Promise<string> => {
        const { stdout } = await execFile("agent-browser", ["--session-name", session, ...args], {
          timeout: 20_000
        })
        return stdout.trim()
      }

      try {
        await browser("open", url)
        await browser("wait", "--load", "networkidle")
        await waitForSelector(browser, "#keyed-plugin")

        const result = JSON.parse(
          await browser(
            "eval",
            `(async () => {
              const el = document.querySelector("#keyed-plugin")
              const deadline = Date.now() + 2000
              while (Date.now() < deadline && el?.textContent !== "item-name:from suffix") {
                await new Promise((resolve) => setTimeout(resolve, 25))
              }
              return {
                text: el?.textContent,
                hasKeyedAttribute: el?.hasAttribute("data-keyed-check:item-name"),
                seen: window.__datastarKitKeyedPlugin ?? null
              }
            })()`
          )
        ) as {
          text: string
          hasKeyedAttribute: boolean
          seen: { key: string; value: string } | null
        }

        expect(result).toEqual({
          text: "item-name:from suffix",
          hasKeyedAttribute: true,
          seen: { key: "item-name", value: "from suffix" }
        })
      } finally {
        await execFile("agent-browser", ["--session-name", session, "close"], {
          timeout: 20_000
        }).catch(() => undefined)
        await closeServer(server)
      }
    },
    30_000
  )

  browserIt(
    "time travels through debugger timeline snapshots",
    async () => {
      const session = `datastar-kit-time-travel-${process.pid}-${Date.now()}`
      const { server, url } = await serveTimeTravelFixture()
      const browser = async (...args: ReadonlyArray<string>): Promise<string> => {
        const { stdout } = await execFile("agent-browser", ["--session-name", session, ...args], {
          timeout: 20_000
        })
        return stdout.trim()
      }
      const statusSelector = ".dsk-debug-timeline-status"
      const waitForState = async (expression: string): Promise<void> => {
        await browser(
          "eval",
          `(async () => {
            const debuggerRoot = () => document.querySelector("datastar-kit-debugger")?.shadowRoot
            const ready = () => {
              const count = document.querySelector("#count")?.textContent
              const status = debuggerRoot()?.querySelector(${JSON.stringify(statusSelector)})?.textContent
              return ${expression}
            }
            const deadline = Date.now() + 4000
            while (Date.now() < deadline && !ready()) {
              await new Promise((resolve) => setTimeout(resolve, 50))
            }
            if (!ready()) {
              const count = document.querySelector("#count")?.textContent
              const status = debuggerRoot()?.querySelector(${JSON.stringify(statusSelector)})?.textContent
              throw new Error("Timed out waiting for ${expression.replaceAll('"', "'")}; count=" + count + " status=" + status)
            }
          })()`
        )
      }

      try {
        await browser("open", url)
        await browser("wait", "--load", "networkidle")
        await waitForSelector(browser, "#increment")

        await waitForState(`status?.includes("1 snapshot")`)
        const mounted = JSON.parse(
          await browser(
            "eval",
            `(() => {
              const root = document.querySelector("datastar-kit-debugger")?.shadowRoot
              const details = root?.querySelector("details")
              const collapsedByDefault = details?.open === false
              details?.querySelector("summary")?.click()
              const hiddenPanel = root?.querySelector('[data-panel="events"]')
              const hiddenControl = root?.querySelector('[data-action="clear-events"]')
              const result = {
                collapsedByDefault,
                bridge: document.querySelector("[data-datastar-kit-debugger-bridge]") !== null,
                hiddenPanelDisplay: hiddenPanel ? getComputedStyle(hiddenPanel).display : null,
                hiddenControlDisplay: hiddenControl ? getComputedStyle(hiddenControl).display : null
              }
              details?.querySelector("summary")?.click()
              return result
            })()`
          )
        ) as {
          collapsedByDefault: boolean
          bridge: boolean
          hiddenPanelDisplay: string | null
          hiddenControlDisplay: string | null
        }
        expect(mounted).toEqual({
          collapsedByDefault: true,
          bridge: true,
          hiddenPanelDisplay: "none",
          hiddenControlDisplay: "none"
        })

        await browser(
          "eval",
          `document.querySelector("#app")?.append(document.querySelector("datastar-kit-debugger"))`
        )

        await browser("eval", `document.querySelector("#increment").click()`)
        await waitForState(`count === "1" && status?.includes("2 snapshots")`)
        const recorded = JSON.parse(
          await browser(
            "eval",
            `(() => {
              const root = document.querySelector("datastar-kit-debugger")?.shadowRoot
              return {
                signals: root?.querySelector('[data-role="signals"]')?.textContent,
                events: root?.querySelector('[data-role="event-count"]')?.textContent
              }
            })()`
          )
        ) as { signals: string; events: string }
        expect(recorded.signals).toContain('"count": 1')
        expect(recorded.events).not.toBe("0 events")

        await browser("eval", `document.querySelector("#increment").click()`)
        await waitForState(`count === "2" && status?.includes("3 snapshots")`)

        await browser(
          "eval",
          `(() => {
            const range = document.querySelector("datastar-kit-debugger")?.shadowRoot?.querySelector(".dsk-timeline-range")
            range.value = "0"
            range.dispatchEvent(new InputEvent("input", { bubbles: true }))
          })()`
        )
        await waitForState(`count === "0" && status?.startsWith("1/3")`)

        await browser(
          "eval",
          `document.querySelector("datastar-kit-debugger")?.shadowRoot?.querySelector(".dsk-debug-live").click()`
        )
        await waitForState(`count === "2" && status?.includes("live")`)

        const afterResume = JSON.parse(
          await browser(
            "eval",
            `(async () => {
              document.querySelector("#increment").click()
              const deadline = Date.now() + 4000
              while (Date.now() < deadline && document.querySelector("#count")?.textContent !== "3") {
                await new Promise((resolve) => setTimeout(resolve, 50))
              }
              return { count: document.querySelector("#count")?.textContent }
            })()`
          )
        ) as { count: string }
        expect(afterResume.count).toBe("3")

        const formattedEvent = JSON.parse(
          await browser(
            "eval",
            `(() => {
              document.dispatchEvent(new CustomEvent("datastar-fetch", {
                detail: { type: "started", argsRaw: { value: '<img src=x onerror="window.__injected=true">' } }
              }))
              document.dispatchEvent(new CustomEvent("datastar-fetch", {
                detail: {
                  type: "datastar-patch-elements",
                  argsRaw: { elements: '<section id="result"><strong>Updated</strong></section>' }
                }
              }))
              const root = document.querySelector("datastar-kit-debugger")?.shadowRoot
              const patchEvent = Array.from(root?.querySelectorAll(".dsk-debug-event") ?? [])
                .find((element) => element.querySelector("summary")?.textContent?.includes("datastar-patch-elements"))
              return {
                formattedPatch: patchEvent?.querySelector('pre[data-content="html"]')?.textContent,
                injectedElement: root?.querySelector(".dsk-debug-event img") !== null
              }
            })()`
          )
        ) as { formattedPatch: string; injectedElement: boolean }
        expect(formattedEvent.formattedPatch).toBe(
          '<section id="result">\n  <strong>Updated</strong>\n</section>'
        )
        expect(formattedEvent.injectedElement).toBe(false)

        const afterRemoval = JSON.parse(
          await browser(
            "eval",
            `(async () => {
              document.querySelector("datastar-kit-debugger")?.remove()
              await Promise.resolve()
              return {
                bridge: document.querySelector("[data-datastar-kit-debugger-bridge]") !== null,
                callback: window.__datastarKitDebugger !== undefined
              }
            })()`
          )
        ) as { bridge: boolean; callback: boolean }
        expect(afterRemoval).toEqual({ bridge: false, callback: false })
      } finally {
        await execFile("agent-browser", ["--session-name", session, "close"], {
          timeout: 20_000
        }).catch(() => undefined)
        await closeServer(server)
      }
    },
    45_000
  )

  browserIt(
    "applies 200 direct JSON signal responses and ignores non-200 action bodies",
    async () => {
      const session = `datastar-kit-runtime-${process.pid}-${Date.now()}`
      const { server, url } = await serveRuntimeFixture()
      const browser = async (...args: ReadonlyArray<string>): Promise<string> => {
        const { stdout } = await execFile("agent-browser", ["--session-name", session, ...args], {
          timeout: 20_000
        })
        return stdout.trim()
      }

      try {
        await browser("open", url)
        await browser("wait", "--load", "networkidle")
        await waitForSelector(browser, "#ignored")

        const initial = JSON.parse(
          await browser("eval", `({ count: document.querySelector("#count")?.textContent })`)
        ) as { count: string }
        expect(initial.count).toBe("0")

        const afterIgnored = JSON.parse(
          await browser(
            "eval",
            `(async () => {
            document.querySelector("#ignored").click()
            await new Promise((resolve) => setTimeout(resolve, 250))
            return { count: document.querySelector("#count")?.textContent }
          })()`
          )
        ) as { count: string }
        expect(afterIgnored.count).toBe("0")

        const afterIncrement = JSON.parse(
          await browser(
            "eval",
            `(async () => {
            document.querySelector("#increment").click()
            const deadline = Date.now() + 2000
            while (Date.now() < deadline && document.querySelector("#count")?.textContent !== "1") {
              await new Promise((resolve) => setTimeout(resolve, 25))
            }
            return { count: document.querySelector("#count")?.textContent }
          })()`
          )
        ) as { count: string }
        expect(afterIncrement.count).toBe("1")
      } finally {
        await execFile("agent-browser", ["--session-name", session, "close"], {
          timeout: 20_000
        }).catch(() => undefined)
        await closeServer(server)
      }
    },
    30_000
  )
})
