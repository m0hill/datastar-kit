import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import { createServer, get as httpGet, type IncomingMessage, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { route, router, textResponse, withSignals, type Handler } from "../src/handler.js"
import { createNodeListener } from "../src/node.js"
import { eventStreamResponse } from "../src/realtime.js"
import { patchSignalsResponse } from "../src/response.js"

const CounterSignals = Schema.Struct({
  count: Schema.Number
})

let server: Server | undefined

const listen = async (app: Handler<unknown, never>): Promise<string> => {
  server = createServer(createNodeListener(app))
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
})

describe("Node runtime adapter", () => {
  it("serves exact routes through node:http", async () => {
    const origin = await listen(router(route("GET", "/", () => Effect.succeed(textResponse("ok")))))
    const response = await fetch(origin)

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("ok")
  })

  it("preserves POST bodies for Datastar signal decoding", async () => {
    const app = router(
      route(
        "POST",
        "/increment",
        withSignals(CounterSignals, (signals) => Effect.succeed(patchSignalsResponse({ count: signals.count + 1 })))
      )
    )
    const origin = await listen(app)
    const response = await fetch(`${origin}/increment`, {
      method: "POST",
      body: JSON.stringify({ count: 4 })
    })

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":5}\n\n')
  })

  it("returns router 404s through node:http", async () => {
    const origin = await listen(router(route("GET", "/", () => Effect.succeed(textResponse("ok")))))
    const response = await fetch(`${origin}/missing`)

    expect(response.status).toBe(404)
  })

  it("turns unhandled Effect failures into 500 responses", async () => {
    const origin = await listen(router(route("GET", "/boom", () => Effect.fail("boom"))))
    const response = await fetch(`${origin}/boom`)

    expect(response.status).toBe(500)
    expect(await response.text()).toBe("Internal Server Error")
  })

  it("streams response chunks without waiting for the body to close", async () => {
    let releaseSecond!: () => void
    const second = new Promise<void>((resolve) => {
      releaseSecond = resolve
    })
    async function* events(): AsyncIterable<string> {
      yield "event: first\n\n"
      await second
      yield "event: second\n\n"
    }

    const origin = await listen(router(route("GET", "/events", () => Effect.succeed(eventStreamResponse(events())))))
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

  it("flushes streaming headers before the first body chunk", async () => {
    let release!: () => void
    const firstEvent = new Promise<void>((resolve) => {
      release = resolve
    })
    async function* events(): AsyncIterable<string> {
      await firstEvent
      yield "event: ready\n\n"
    }

    const origin = await listen(router(route("GET", "/events", () => Effect.succeed(eventStreamResponse(events())))))
    const response = await fetch(`${origin}/events`)
    const reader = response.body?.getReader()

    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(reader).toBeDefined()

    release()
    const first = await reader!.read()
    expect(first.done).toBe(false)
    expect(new TextDecoder().decode(first.value)).toBe("event: ready\n\n")
  })

  it("cancels streaming response bodies when Node clients disconnect", async () => {
    let returned = false
    const neverEndingEvents: AsyncIterable<string> = {
      [Symbol.asyncIterator]: () => ({
        next: () => new Promise<IteratorResult<string>>(() => undefined),
        return: () => {
          returned = true
          return Promise.resolve({ done: true, value: undefined })
        }
      })
    }

    const origin = await listen(
      router(route("GET", "/events", () => Effect.succeed(eventStreamResponse(neverEndingEvents))))
    )
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const request = httpGet(`${origin}/events`, resolve)
      request.on("error", reject)
    })

    response.destroy()
    for (let attempt = 0; attempt < 20; attempt++) {
      if (returned) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 5))
    }

    expect(returned).toBe(true)
  })

  it("aborts Web Request signals when Node clients disconnect", async () => {
    let aborted = false
    const origin = await listen(
      router(
        route("GET", "/events", (request) => {
          request.signal.addEventListener("abort", () => {
            aborted = true
          }, { once: true })

          return Effect.succeed(eventStreamResponse({
            [Symbol.asyncIterator]: () => ({
              next: () => new Promise<IteratorResult<string>>(() => undefined)
            })
          }))
        })
      )
    )
    const response = await new Promise<IncomingMessage>((resolve, reject) => {
      const clientRequest = httpGet(`${origin}/events`, resolve)
      clientRequest.on("error", reject)
    })

    response.destroy()
    for (let attempt = 0; attempt < 20; attempt++) {
      if (aborted) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 5))
    }

    expect(aborted).toBe(true)
  })

  it("allows custom failure responses", async () => {
    const app = router(route("GET", "/boom", () => Effect.fail("boom")))
    server = createServer(createNodeListener(app, { onError: () => textResponse("handled", { status: 418 }) }))
    await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))
    const address = server.address() as AddressInfo

    const response = await fetch(`http://127.0.0.1:${address.port}/boom`)

    expect(response.status).toBe(418)
    expect(await response.text()).toBe("handled")
  })
})
