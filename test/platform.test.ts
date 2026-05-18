import { describe, expect, it } from "vitest"
import { stream } from "../src/reply.js"

describe("Web Fetch primitives", () => {
  it("dispatches plain fetch-compatible handlers", async () => {
    const handler = (request: Request): Response => {
      const url = new URL(request.url)
      if (request.method === "GET" && url.pathname === "/") {
        return new Response("home")
      }
      if (request.method === "POST" && url.pathname === "/submit") {
        return new Response("submitted", { status: 201 })
      }
      return new Response("Not Found", { status: 404 })
    }

    const home = handler(new Request("http://localhost/"))
    const submitted = handler(new Request("http://localhost/submit", { method: "POST" }))
    const missing = handler(new Request("http://localhost/missing"))

    expect(home.status).toBe(200)
    expect(await home.text()).toBe("home")
    expect(submitted.status).toBe(201)
    expect(await submitted.text()).toBe("submitted")
    expect(missing.status).toBe(404)
  })

  it("streams Datastar SSE responses through native Response bodies", async () => {
    let releaseSecond!: () => void
    const second = new Promise<void>((resolve) => {
      releaseSecond = resolve
    })

    async function* events() {
      yield "event: first\n\n"
      await second
      yield "event: second\n\n"
    }

    const response = stream(events())
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(reader).toBeDefined()

    const first = await reader!.read()
    expect(first.done).toBe(false)
    expect(decoder.decode(first.value)).toBe("event: first\n\n")

    releaseSecond()
    const next = await reader!.read()
    expect(next.done).toBe(false)
    expect(decoder.decode(next.value)).toBe("event: second\n\n")
    await expect(reader!.read()).resolves.toEqual({ done: true, value: undefined })
  })
})
