import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"

const enabled = process.env.NODE_ENV === "development"

/** Development-only debugger asset used by the official examples. */
export const debuggerDevelopment = {
  enabled,
  scriptPath: "/__dev/datastar-kit-debugger.js",
  loadScript: async (): Promise<string | undefined> =>
    enabled
      ? readFile(fileURLToPath(import.meta.resolve("datastar-kit/debugger")), "utf8")
      : undefined
} as const
