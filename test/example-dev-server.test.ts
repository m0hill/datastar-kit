import { describe, expect, it } from "vitest"
import { exampleNames, startExampleServer } from "../examples/dev-server.js"
import { DATASTAR_CDN } from "../src/client.js"

describe("example dev server", () => {
  it("lists every runnable example", () => {
    expect(exampleNames).toEqual(["counter", "tsx-counter", "search", "live-counter"])
  })

  it("serves an example through the shared dev server", async () => {
    const server = await startExampleServer("counter", { port: 0 })

    try {
      const response = await fetch(server.origin)
      const html = await response.text()

      expect(response.status).toBe(200)
      expect(html).toContain("ts-star counter")
      expect(html).toContain(`src="${DATASTAR_CDN}"`)
      expect(html).not.toContain('src="/datastar.js"')
      expect(server.port).toBeGreaterThan(0)
    } finally {
      await server.close()
    }
  })
})
