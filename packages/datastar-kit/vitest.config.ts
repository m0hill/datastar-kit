import { fileURLToPath } from "node:url"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig, type Plugin } from "vitest/config"

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

/** Serves the Datastar action endpoints that browser tests fetch from the page. */
const browserFixtureEndpoints = (): Plugin => {
  let timeTravelCount = 0

  return {
    name: "datastar-kit-browser-fixture-endpoints",
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const json = (status: number, body: unknown) => {
          response.writeHead(status, { "content-type": "application/json; charset=utf-8" })
          response.end(JSON.stringify(body))
        }

        if (request.url === "/fixtures/runtime/ignored") return json(202, { count: 99 })
        if (request.url === "/fixtures/runtime/increment") return json(200, { count: 1 })
        if (request.url === "/fixtures/time-travel/increment") {
          timeTravelCount += 1
          return json(200, { count: timeTravelCount })
        }

        next()
      })
    }
  }
}

export default defineConfig({
  resolve: {
    alias: [
      { find: "datastar-kit/jsx-runtime", replacement: fromRoot("./src/jsx-runtime.ts") },
      { find: "datastar-kit/jsx-dev-runtime", replacement: fromRoot("./src/jsx-dev-runtime.ts") },
      { find: "datastar-kit/sse", replacement: fromRoot("./src/sse.ts") },
      { find: "datastar-kit/debugger", replacement: fromRoot("./src/debugger/index.ts") },
      { find: "datastar-kit", replacement: fromRoot("./src/index.ts") }
    ]
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["test/**/*.test.{ts,tsx}"],
          exclude: ["test/browser/**", "dist/**", "node_modules/**"]
        }
      },
      {
        extends: true,
        plugins: [browserFixtureEndpoints()],
        test: {
          name: "browser",
          include: ["test/browser/**/*.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }]
          }
        }
      }
    ]
  }
})
