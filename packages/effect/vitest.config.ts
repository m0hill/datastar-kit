import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const fromCore = (path: string): string =>
  fileURLToPath(new URL(`../datastar-kit/src/${path}`, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: "datastar-kit/jsx-runtime", replacement: fromCore("jsx-runtime.ts") },
      { find: "datastar-kit/jsx-dev-runtime", replacement: fromCore("jsx-dev-runtime.ts") },
      { find: "datastar-kit", replacement: fromCore("index.ts") }
    ]
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"]
  }
})
