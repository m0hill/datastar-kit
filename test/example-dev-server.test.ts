import { describe, expect, it } from "vitest"
import { exampleNames, startExampleServer } from "../examples/dev-server.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

describe("example dev server", () => {
  it("lists every runnable example", () => {
    expect(exampleNames).toEqual(["counter", "tsx-counter", "search", "live-counter", "validation-form", "hono-counter"])
  })

  it("serves an example through the shared dev server", async () => {
    const server = await startExampleServer("counter", { port: 0 })

    try {
      const response = await fetch(server.origin)
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(html).toContain("ts-star counter")
      expect(html).toContain(`src="${DATASTAR_CDN}"`)
      expect(server.port).toBeGreaterThan(0)
    } finally {
      await server.close()
    }
  })

  it("serves Hono integration through the same fetch-compatible dev server", async () => {
    const server = await startExampleServer("hono-counter", { port: 0 })

    try {
      const response = await fetch(server.origin)
      expect(response.status).toBe(200)
      expect(await response.text()).toContain("ts-star counter")
    } finally {
      await server.close()
    }
  })
})
