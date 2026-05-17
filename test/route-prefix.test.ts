import * as Effect from "effect/Effect"
import { describe, expect, it } from "vitest"
import { prefixRoutes, route, router, textResponse } from "../src/handler.js"

describe("route prefixing", () => {
  it("prefixes exact routes without adding params or nesting semantics", async () => {
    const [status] = prefixRoutes("/api", route("GET", "/status", () => Effect.succeed(textResponse("ok"))))
    const app = router(status)
    const response = await Effect.runPromise(app(new Request("http://localhost/api/status")))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("ok")
  })

  it("normalizes trailing and missing slashes in prefixes", () => {
    const [one] = prefixRoutes("/api/", route("GET", "status", () => Effect.succeed(textResponse("ok"))))
    const [root] = prefixRoutes("/", route("GET", "/status", () => Effect.succeed(textResponse("ok"))))

    expect(one.path).toBe("/api/status")
    expect(root.path).toBe("/status")
  })
})
