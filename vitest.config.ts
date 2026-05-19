import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const fromRoot = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: "ts-star/jsx-runtime", replacement: fromRoot("./src/jsx-runtime.ts") },
      { find: "ts-star/jsx-dev-runtime", replacement: fromRoot("./src/jsx-dev-runtime.ts") },
      { find: "ts-star/jsx", replacement: fromRoot("./src/jsx.ts") },
      { find: "ts-star/sse", replacement: fromRoot("./src/sse.ts") },
      { find: "ts-star", replacement: fromRoot("./src/index.ts") }
    ]
  },
  test: {
    globals: true,
    environment: "node",
    exclude: ["dist/**", "node_modules/**"]
  }
})
