import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

interface PackageJson {
  readonly scripts?: Readonly<Record<string, string>>
}

const readPackageJson = async (): Promise<PackageJson> =>
  JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as PackageJson

const readReadme = (): Promise<string> =>
  readFile(new URL("../README.md", import.meta.url), "utf8")

describe("package scripts", () => {
  it("exposes focused scripts for checking examples", async () => {
    const scripts = (await readPackageJson()).scripts ?? {}

    expect(scripts["check:examples"]).toBe("pnpm run typecheck && pnpm run test:examples")
    expect(scripts["dev:counter"]).toBe("pnpm run build && node dist/examples/dev-server.js counter")
    expect(scripts["dev:tsx-counter"]).toBe("pnpm run build && node dist/examples/dev-server.js tsx-counter")
    expect(scripts["dev:search"]).toBe("pnpm run build && node dist/examples/dev-server.js search")
    expect(scripts["dev:live-counter"]).toBe("pnpm run build && node dist/examples/dev-server.js live-counter")
    expect(scripts["check:example:counter"]).toBe("pnpm run typecheck && pnpm run test:example:counter")
    expect(scripts["check:example:tsx-counter"]).toBe("pnpm run typecheck && pnpm run test:example:tsx-counter")
    expect(scripts["check:example:search"]).toBe("pnpm run typecheck && pnpm run test:example:search")
    expect(scripts["check:example:live-counter"]).toBe("pnpm run typecheck && pnpm run test:example:live-counter")
    expect(scripts["test:examples"]).toContain("test/example-counter.test.ts")
    expect(scripts["test:examples"]).toContain("test/example-tsx-counter.test.ts")
    expect(scripts["test:examples"]).toContain("test/search-example.test.ts")
    expect(scripts["test:examples"]).toContain("test/live-counter-example.test.ts")
    expect(scripts["test:example:tsx-counter"]).toBe("vitest run test/example-tsx-counter.test.ts")
  })

  it("documents the example checking scripts in the README", async () => {
    const readme = await readReadme()

    expect(readme).toContain("## Checking examples")
    expect(readme).toContain("pnpm run check:examples")
    expect(readme).toContain("pnpm run check:example:tsx-counter")
    expect(readme).toContain("pnpm run dev:tsx-counter")
    expect(readme).toContain("PORT=4000")
    expect(readme).toContain("The `check:*` scripts run `typecheck` first")
  })
})
