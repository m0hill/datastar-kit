import { describe, expect, it } from "vitest"
import { emptyResponse } from "../src/response.js"

describe("empty responses", () => {
  it("defaults to 204 No Content", async () => {
    const response = emptyResponse()

    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")
  })

  it("supports alternate empty status codes and headers", () => {
    const response = emptyResponse(202, { headers: { "x-accepted": "true" } })

    expect(response.status).toBe(202)
    expect(response.headers.get("x-accepted")).toBe("true")
  })
})
