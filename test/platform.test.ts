import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { platformRouter } from "../src/platform.js"
import { eventStreamResponse } from "../src/realtime.js"
import { closePlatformListeners, makePlatformListener } from "./platform-listener.js"

let server: Server | undefined

const serveListener = async (listener: RequestListener): Promise<string> => {
  server = createServer(listener)
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))
  const address = server.address() as AddressInfo
  return `http://127.0.0.1:${address.port}`
}

afterEach(async () => {
  const current = server
  server = undefined
  if (current !== undefined) {
    await new Promise<void>((resolve, reject) => current.close((error) => error ? reject(error) : resolve()))
  }
  await closePlatformListeners()
})

describe("Effect Platform HTTP runtime", () => {
  it("dispatches native Effect Platform routes", async () => {
    const app = platformRouter(
      HttpRouter.route("GET", "/", HttpServerResponse.text("home")),
      HttpRouter.route("POST", "/submit", HttpServerResponse.text("submitted", { status: 201 }))
    )
    const listener = await makePlatformListener(app)
    const origin = await serveListener(listener)

    const home = await fetch(origin)
    const submitted = await fetch(`${origin}/submit`, { method: "POST" })
    const missing = await fetch(`${origin}/missing`)

    expect(home.status).toBe(200)
    expect(await home.text()).toBe("home")
    expect(submitted.status).toBe(201)
    expect(await submitted.text()).toBe("submitted")
    expect(missing.status).toBe(404)
  })

  it("streams Datastar SSE responses through native Effect Platform routing", async () => {
    let releaseSecond!: () => void
    const second = new Promise<void>((resolve) => {
      releaseSecond = resolve
    })
    async function* events(): AsyncIterable<string> {
      yield "event: first\n\n"
      await second
      yield "event: second\n\n"
    }

    const app = platformRouter(
      HttpRouter.route("GET", "/events", Effect.succeed(eventStreamResponse(events())))
    )
    const listener = await makePlatformListener(app)
    const origin = await serveListener(listener)
    const response = await fetch(`${origin}/events`)
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
