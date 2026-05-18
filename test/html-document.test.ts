import { describe, expect, it } from "vitest"
import { h, page } from "../src/html.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

describe("HTML document helper", () => {
  it("renders a doctype and basic document shell", () => {
    expect(page({ body: h("main", {}, "Hello") })).toBe(
      '<!doctype html><html lang="en"><head></head><body><main>Hello</main></body></html>'
    )
  })

  it("supports custom lang and head/body children", () => {
    expect(
      page({
        lang: "en-US",
        head: [h("title", {}, "Demo"), h("script", { type: "module", src: DATASTAR_CDN })],
        body: [h("main", {}, "Datastar")]
      })
    ).toBe(
      `<!doctype html><html lang="en-US"><head><title>Demo</title><script type="module" src="${DATASTAR_CDN}"></script></head><body><main>Datastar</main></body></html>`
    )
  })
})
