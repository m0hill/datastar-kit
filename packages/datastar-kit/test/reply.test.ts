import { describe, expect, it } from "vitest"
import * as event from "../src/event.js"
import { h } from "../src/html.js"
import * as reply from "../src/reply.js"

if (false) {
  // @ts-expect-error Datastar action body replies own their protocol status.
  reply.patch(h("p", {}, "Updated"), {}, { status: 200 })
  // @ts-expect-error Datastar action body replies own their protocol status.
  reply.signals({ count: 1 }, {}, { status: 200 })
  // @ts-expect-error Datastar no-content replies own their protocol status.
  reply.done({ status: 204 })
  // @ts-expect-error High-level signal replies require a signal-state object.
  reply.signals('{"count":1}')
}

describe("reply page, navigation, and no-content responses", () => {
  it("serves full Datastar pages with normal page status options", async () => {
    const response = reply.page(
      h("main", {}, "Ada & Grace"),
      {},
      { status: 201, headers: { "x-html": "yes" } }
    )
    const html = await response.text()

    expect(response.status).toBe(201)
    expect(response.headers.get("content-type")).toContain("text/html")
    expect(response.headers.get("x-html")).toBe("yes")
    expect(html).toContain("<main>Ada &amp; Grace</main>")
  })

  it("preserves repeated Set-Cookie headers while merging response defaults", () => {
    const response = reply.page(
      h("main", {}, "OK"),
      {},
      {
        headers: new Headers([
          ["set-cookie", "session=abc; Path=/; HttpOnly"],
          ["set-cookie", "theme=dark; Path=/"]
        ])
      }
    )

    expect(response.headers.get("content-type")).toContain("text/html")
    expect(response.headers.getSetCookie()).toEqual([
      "session=abc; Path=/; HttpOnly",
      "theme=dark; Path=/"
    ])
  })

  it("navigates through an SSE script event", async () => {
    const response = reply.navigate("/dashboard?from=login#top", { baseUrl: "https://app.example" })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe(
      event.navigate("/dashboard?from=login#top", { baseUrl: "https://app.example" })
    )
  })

  it("completes commands with an empty 204 response", async () => {
    const response = reply.done({ headers: { "x-done": "yes" } })

    expect(response.status).toBe(204)
    expect(response.headers.get("x-done")).toBe("yes")
    expect(await response.text()).toBe("")
  })
})
