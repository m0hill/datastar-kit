import { fileURLToPath } from "node:url"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"
import { browserFixtureEndpoints } from "./test/browser/fixture-server.js"

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: "datastar-kit/jsx-runtime", replacement: fromRoot("./src/jsx-runtime.ts") },
      { find: "datastar-kit/jsx-dev-runtime", replacement: fromRoot("./src/jsx-dev-runtime.ts") },
      { find: "datastar-kit/sse", replacement: fromRoot("./src/sse.ts") },
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
        plugins: [browserFixtureEndpoints],
        test: {
          name: "browser",
          include: ["test/browser/**/*.test.{ts,tsx}"],
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
