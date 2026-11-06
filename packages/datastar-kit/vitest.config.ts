import { fileURLToPath } from "node:url"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"
import { browserFixtureEndpoints } from "./test/browser/fixture-server.js"

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

// Browser tests run once per supported Datastar release. Add a release by vendoring its bundle as
// `test/browser/vendor/datastar-<version>.js` and listing its version here.
const datastarVersions = ["1.0.0", "1.0.1", "1.0.2", "1.0.3", "1.0.4"] as const

export default defineConfig({
  resolve: {
    alias: [
      { find: "datastar-kit/jsx-runtime", replacement: fromRoot("./src/jsx-runtime.ts") },
      { find: "datastar-kit/jsx-dev-runtime", replacement: fromRoot("./src/jsx-dev-runtime.ts") },
      { find: "datastar-kit/sse", replacement: fromRoot("./src/sse.ts") },
      { find: "datastar-kit/testing", replacement: fromRoot("./src/testing.ts") },
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
      ...datastarVersions.map((version) => ({
        extends: true as const,
        plugins: [browserFixtureEndpoints],
        define: { __DATASTAR_VERSION__: JSON.stringify(version) },
        resolve: {
          alias: [
            {
              find: "datastar-runtime",
              replacement: fromRoot(`./test/browser/vendor/datastar-${version}.js`)
            }
          ]
        },
        test: {
          name: `browser (datastar ${version})`,
          include: ["test/browser/**/*.test.{ts,tsx}"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" as const }]
          }
        }
      }))
    ]
  }
})
