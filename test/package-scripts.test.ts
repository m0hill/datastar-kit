import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

interface PackageJson {
  readonly scripts?: Readonly<Record<string, string>>
}

const readPackageJson = async (): Promise<PackageJson> =>
  JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8")) as PackageJson

describe("package scripts", () => {
  it("exposes focused scripts for checking examples", async () => {
    const scripts = (await readPackageJson()).scripts ?? {}

    expect(scripts["check:examples"]).toBe("pnpm run typecheck && pnpm run test:examples")
    expect(scripts["test:examples"]).toContain("test/example-counter.test.ts")
    expect(scripts["test:examples"]).toContain("test/example-tsx-counter.test.ts")
    expect(scripts["test:examples"]).toContain("test/search-example.test.ts")
    expect(scripts["test:examples"]).toContain("test/live-counter-example.test.ts")
    expect(scripts["test:example:tsx-counter"]).toBe("vitest run test/example-tsx-counter.test.ts")
  })
})
