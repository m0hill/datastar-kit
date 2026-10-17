import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { nodeHandler, type FetchHandler, type NodeRequest } from "../src/node.js"
import * as read from "../src/read.js"
import * as reply from "../src/reply.js"
import * as event from "../src/event.js"

let server: Server | undefined

const listen = async (listener: RequestListener): Promise<string> => {
  server = createServer(listener)
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

const serve = (handler: FetchHandler): Promise<string> => listen(nodeHandler(handler))

afterEach(async () => {
  server?.closeAllConnections()
  await new Promise<void>((resolve) => server?.close(() => resolve()))
  server = undefined
})

describe("datastar-kit/node", () => {
  it("passes method, URL, headers, and streamed bodies to the handler", async () => {
    const url = await serve(async (request) => {
      const signals = await read.signals(request)
      return reply.signals({
        method: request.method,
        path: new URL(request.url).pathname + new URL(request.url).search,
        header: request.headers.get("x-test"),
        signals
      })
    })

    const response = await fetch(`${url}/save?draft=1`, {
      method: "POST",
      headers: { "x-test": "yes", "content-type": "application/json" },
      body: JSON.stringify({ count: 2 })
    })

    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/event-stream")
    expect(await response.text()).toBe(
      'event: datastar-patch-signals\ndata: signals {"method":"POST","path":"/save?draft=1","header":"yes","signals":{"count":2}}\n\n'
    )
  })

  it("reads GET signals from the query string", async () => {
    const url = await serve(async (request) => reply.signals(await read.signals(request)))
    const query = encodeURIComponent(JSON.stringify({ q: "kit" }))

    const response = await fetch(`${url}/search?datastar=${query}`)

    expect(await response.text()).toContain('{"q":"kit"}')
  })

  it("uses a body already parsed by middleware and the pre-mount URL", async () => {
    const handler = nodeHandler(async (request) =>
      reply.signals({ path: new URL(request.url).pathname, signals: await read.signals(request) })
    )
    const url = await listen((req, res) => {
      // Simulate express.json() plus a router mounted at /forms.
      req.resume()
      req.on("end", () => {
        Object.assign(req as NodeRequest, { body: { title: "parsed" }, originalUrl: req.url })
        req.url = "/submit"
        void handler(req, res)
      })
    })

    const response = await fetch(`${url}/forms/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "parsed" })
    })

    expect(await response.text()).toContain('{"path":"/forms/submit","signals":{"title":"parsed"}}')
  })

  it("reads the stream when middleware set a body without parsing it", async () => {
    const handler = nodeHandler(async (request) => reply.signals({ body: await request.text() }))
    const url = await listen((req, res) => {
      // Express 4 body parsers set an empty body for content types they skip.
      Object.assign(req as NodeRequest, { body: {} })
      void handler(req, res)
    })

    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "title=unparsed"
    })

    expect(await response.text()).toContain('{"body":"title=unparsed"}')
  })

  it("preserves status codes and repeated Set-Cookie headers", async () => {
    const url = await serve(() => {
      const headers = new Headers()
      headers.append("set-cookie", "a=1; Path=/")
      headers.append("set-cookie", "b=2; Path=/")
      return reply.done({ headers })
    })

    const response = await fetch(url, { method: "POST" })

    expect(response.status).toBe(204)
    expect(response.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"])
  })

  it("streams SSE events and cancels the stream when the client disconnects", async () => {
    let cleanedUp: () => void = () => undefined
    const cleanup = new Promise<void>((resolve) => {
      cleanedUp = resolve
    })
    let aborted = false
    const url = await serve((request) => {
      request.signal.addEventListener("abort", () => {
        aborted = true
      })
      return reply.stream(
        (async function* () {
          try {
            for (let tick = 1; ; tick += 1) {
              yield event.signals({ tick })
              await new Promise((resolve) => setTimeout(resolve, 10))
            }
          } finally {
            cleanedUp()
          }
        })()
      )
    })
    const client = new AbortController()

    const response = await fetch(url, { signal: client.signal })
    const reader = response.body!.getReader()
    const first = new TextDecoder().decode((await reader.read()).value).split("\n\n")[0]
    client.abort()

    expect(first).toBe('event: datastar-patch-signals\ndata: signals {"tick":1}')
    await cleanup
    expect(aborted).toBe(true)
  })

  it("passes handler errors to next when one is provided", async () => {
    const failure = new Error("boom")
    let received: unknown
    const handler = nodeHandler(() => {
      throw failure
    })
    const url = await listen((req, res) => {
      void handler(req, res, (error) => {
        received = error
        res.statusCode = 418
        res.end()
      })
    })

    const response = await fetch(url)

    expect(response.status).toBe(418)
    expect(received).toBe(failure)
  })
})
