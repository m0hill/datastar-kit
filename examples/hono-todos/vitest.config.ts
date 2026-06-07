import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const fromWorkspace = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "datastar-kit/jsx-runtime",
        replacement: fromWorkspace("../../packages/datastar-kit/src/jsx-runtime.ts")
      },
      {
        find: "datastar-kit/jsx-dev-runtime",
        replacement: fromWorkspace("../../packages/datastar-kit/src/jsx-dev-runtime.ts")
      },
      {
        find: "datastar-kit/sse",
        replacement: fromWorkspace("../../packages/datastar-kit/src/sse.ts")
      },
      {
        find: "datastar-kit/testing/node",
        replacement: fromWorkspace("../../packages/datastar-kit/src/testing/node.ts")
      },
      {
        find: "datastar-kit/testing",
        replacement: fromWorkspace("../../packages/datastar-kit/src/testing/index.ts")
      },
      {
        find: "datastar-kit",
        replacement: fromWorkspace("../../packages/datastar-kit/src/index.ts")
      }
    ]
  },
  test: {
    environment: "node",
    exclude: ["dist/**", "node_modules/**"]
  }
})
