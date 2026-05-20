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
    expect(scripts["dev:append-list"]).toBe("pnpm run build && node dist/examples/dev-server.js append-list")
    expect(scripts["dev:search"]).toBe("pnpm run build && node dist/examples/dev-server.js search")
    expect(scripts["dev:todo-sync"]).toBe("pnpm run build && node dist/examples/todo-sync.js")
    expect(scripts["dev:live-counter"]).toBe("pnpm run build && node dist/examples/dev-server.js live-counter")
    expect(scripts["dev:hono-counter"]).toBe("pnpm run build && node dist/examples/dev-server.js hono-counter")
    expect(scripts["dev:hono-live-counter"]).toBe("pnpm run build && node dist/examples/dev-server.js hono-live-counter")
    expect(scripts["dev:validation-form"]).toBe("pnpm run build && node dist/examples/dev-server.js validation-form")
    expect(scripts["check:example:counter"]).toBe("pnpm run typecheck && pnpm run test:example:counter")
    expect(scripts["check:example:tsx-counter"]).toBe("pnpm run typecheck && pnpm run test:example:tsx-counter")
    expect(scripts["check:example:append-list"]).toBe("pnpm run typecheck && pnpm run test:example:append-list")
    expect(scripts["check:example:search"]).toBe("pnpm run typecheck && pnpm run test:example:search")
    expect(scripts["check:example:todo-sync"]).toBe("pnpm run typecheck && pnpm run test:example:todo-sync")
    expect(scripts["check:example:live-counter"]).toBe("pnpm run typecheck && pnpm run test:example:live-counter")
    expect(scripts["check:example:hono-counter"]).toBe("pnpm run typecheck && pnpm run test:example:hono-counter")
    expect(scripts["check:example:hono-live-counter"]).toBe("pnpm run typecheck && pnpm run test:example:hono-live-counter")
    expect(scripts["check:example:validation-form"]).toBe("pnpm run typecheck && pnpm run test:example:validation-form")
    expect(scripts["test:examples"]).toContain("test/example-counter.test.ts")
    expect(scripts["test:examples"]).toContain("test/example-tsx-counter.test.ts")
    expect(scripts["test:examples"]).toContain("test/append-list-example.test.ts")
    expect(scripts["test:examples"]).toContain("test/search-example.test.ts")
    expect(scripts["test:examples"]).toContain("test/todo-sync-example.test.ts")
    expect(scripts["test:examples"]).toContain("test/live-counter-example.test.ts")
    expect(scripts["test:examples"]).toContain("test/hono-counter-example.test.ts")
    expect(scripts["test:examples"]).toContain("test/hono-live-counter-example.test.ts")
    expect(scripts["test:examples"]).toContain("test/validation-form-example.test.ts")
    expect(scripts["test:example:tsx-counter"]).toBe("vitest run test/example-tsx-counter.test.ts")
    expect(scripts["test:example:append-list"]).toBe("vitest run test/append-list-example.test.ts")
  })

  it("documents the example checking scripts in the README", async () => {
    const readme = await readReadme()

    expect(readme).toContain("## Checking examples")
    expect(readme).toContain("pnpm run check:examples")
    expect(readme).toContain("pnpm run check:example:tsx-counter")
    expect(readme).toContain("pnpm run check:example:append-list")
    expect(readme).toContain("pnpm run check:example:validation-form")
    expect(readme).toContain("pnpm run check:example:todo-sync")
    expect(readme).toContain("pnpm run check:example:hono-counter")
    expect(readme).toContain("pnpm run check:example:hono-live-counter")
    expect(readme).toContain("pnpm run dev:tsx-counter")
    expect(readme).toContain("pnpm run dev:append-list")
    expect(readme).toContain("pnpm run dev:validation-form")
    expect(readme).toContain("pnpm run dev:todo-sync")
    expect(readme).toContain("pnpm run dev:hono-counter")
    expect(readme).toContain("pnpm run dev:hono-live-counter")
    expect(readme).toContain("PORT=4000")
    expect(readme).toContain("The `check:*` scripts run `typecheck` first")
  })
})
