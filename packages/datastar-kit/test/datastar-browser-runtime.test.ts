import { execFile as execFileCallback, spawnSync } from "node:child_process"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"
import { dataSignals, on, post, signal, text } from "../src/ds/index.js"
import { h, mergeProps, renderToString } from "../src/html.js"

const execFile = promisify(execFileCallback)
const agentBrowserAvailable =
  spawnSync("agent-browser", ["--version"], { stdio: "ignore" }).status === 0
const browserIt = agentBrowserAvailable ? it : it.skip
const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

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
          mergeProps({ id: "app" }, dataSignals({ count: 0 }, { ifMissing: true })),
          h("output", mergeProps({ id: "count" }, text(count)), "0"),
          h(
            "button",
            mergeProps({ id: "ignored", type: "button" }, on("click", post("/ignored"))),
            "ignored"
          ),
          h(
            "button",
            mergeProps({ id: "increment", type: "button" }, on("click", post("/increment"))),
            "+"
          )
        )
      )
    )
  )}`
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
