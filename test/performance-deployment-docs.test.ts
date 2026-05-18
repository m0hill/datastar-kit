import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

const readDoc = (name: string): Promise<string> =>
  readFile(new URL(`../docs/${name}`, import.meta.url), "utf8")

describe("performance and deployment documentation", () => {
  it("documents production constraints for compression, proxies, caching, and stream scalability", async () => {
    const doc = await readDoc("performance-deployment.md")

    expect(doc).toContain("gzip or Brotli")
    expect(doc).toContain("proxy_buffering off")
    expect(doc).toContain("public, max-age=31536000, immutable")
    expect(doc).toContain("one SSE connection")
    expect(doc).toContain("Deployment smoke test")
  })

  it("links performance guidance from deployment and live-query docs", async () => {
    const deployment = await readDoc("deployment.md")
    const liveQueries = await readDoc("live-queries.md")

    expect(deployment).toContain("performance-deployment.md")
    expect(liveQueries).toContain("disable buffering")
    expect(liveQueries).toContain("heartbeat interval")
  })
})
