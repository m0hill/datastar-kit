import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import { pathToFileURL } from "node:url"
import { handle as appendListHandle } from "./append-list.js"
import { handle as counterHandle } from "./counter.js"
import { makeHonoCounter } from "./hono-counter.js"
import { makeHonoLiveCounter } from "./hono-live-counter.js"
import { makeLiveCounter } from "./live-counter.js"
import { handle as searchHandle } from "./search.js"
import { handle as todoSyncHandle, shutdown as shutdownTodoSync } from "./todo-sync.js"
import { handle as tsxCounterHandle } from "./tsx-counter.js"
import { handle as validationFormHandle } from "./validation-form.js"

export const exampleNames = ["counter", "tsx-counter", "append-list", "search", "live-counter", "validation-form", "hono-counter", "hono-live-counter", "todo-sync"] as const
export type ExampleName = typeof exampleNames[number]

export interface DevServerOptions {
  readonly host?: string
  readonly port?: number
}

export interface RunningExampleServer {
  readonly name: ExampleName
  readonly host: string
  readonly port: number
  readonly origin: string
  readonly server: Server
  readonly close: () => Promise<void>
}

type FetchHandler = (request: Request) => Response | Promise<Response>

interface ExampleRuntime {
  readonly handle: FetchHandler
  readonly close?: () => void | Promise<void>
}

const isExampleName = (value: string): value is ExampleName =>
  (exampleNames as readonly string[]).includes(value)

const makeExampleRuntime = (name: ExampleName): ExampleRuntime => {
  switch (name) {
    case "counter":
      return { handle: counterHandle }
    case "tsx-counter":
      return { handle: tsxCounterHandle }
    case "append-list":
      return { handle: appendListHandle }
    case "search":
      return { handle: searchHandle }
    case "live-counter": {
      const liveCounter = makeLiveCounter()
      return { handle: liveCounter.handle, close: liveCounter.shutdown }
    }
    case "validation-form":
      return { handle: validationFormHandle }
    case "hono-counter": {
      const honoCounter = makeHonoCounter()
      return { handle: honoCounter.handle }
    }
    case "hono-live-counter": {
      const liveCounter = makeHonoLiveCounter()
      return { handle: liveCounter.handle, close: liveCounter.shutdown }
    }
    case "todo-sync":
      return { handle: todoSyncHandle, close: shutdownTodoSync }
  }
}

const closeNodeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error))
  })

const headersFromNodeRequest = (request: IncomingMessage): Headers => {
  const headers = new Headers()
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) {
      continue
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(name, item)
      }
    } else {
      headers.set(name, value)
    }
  }
  return headers
}

const requestFromNode = (request: IncomingMessage, origin: string): Request => {
  const method = request.method ?? "GET"
  const init: RequestInit = {
    method,
    headers: headersFromNodeRequest(request)
  }

  if (method !== "GET" && method !== "HEAD") {
    init.body = new ReadableStream<Uint8Array>({
      start(controller) {
        request.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength))
        })
        request.on("end", () => controller.close())
        request.on("error", (error) => controller.error(error))
      }
    })
    ;(init as { duplex: "half" }).duplex = "half"
  }

  return new Request(new URL(request.url ?? "/", origin), init)
}

const sendResponse = async (nodeResponse: ServerResponse, response: Response): Promise<void> => {
  nodeResponse.statusCode = response.status
  nodeResponse.statusMessage = response.statusText
  response.headers.forEach((value, name) => {
    nodeResponse.setHeader(name, value)
  })

  if (response.body !== null && nodeResponse.req.method !== "HEAD") {
    const reader = response.body.getReader()
    try {
      while (true) {
        const result = await reader.read()
        if (result.done) {
          break
        }
        if (!nodeResponse.write(result.value)) {
          await new Promise<void>((resolve) => nodeResponse.once("drain", resolve))
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  nodeResponse.end()
}

const createRequestListener = (handler: FetchHandler, origin: string) =>
  async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    try {
      await sendResponse(response, await handler(requestFromNode(request, origin)))
    } catch (error) {
      console.error(error)
      response.statusCode = 500
      response.setHeader("content-type", "text/plain")
      response.end("Internal Server Error")
    }
  }

export const startExampleServer = async (
  name: ExampleName,
  options: DevServerOptions = {}
): Promise<RunningExampleServer> => {
  const host = options.host ?? "127.0.0.1"
  const port = options.port ?? 3000
  const runtime = makeExampleRuntime(name)
  const server = createServer()

  await new Promise<void>((resolve) => server.listen(port, host, resolve))

  const address = server.address() as AddressInfo
  const origin = `http://${host}:${address.port}`
  server.on("request", createRequestListener(runtime.handle, origin))
  let closed = false

  const close = async (): Promise<void> => {
    if (closed) {
      return
    }
    closed = true

    await closeNodeServer(server)
    await runtime.close?.()
  }

  return {
    name,
    host,
    port: address.port,
    origin,
    server,
    close
  }
}

const usage = (): string =>
  `Usage: node dist/examples/dev-server.js <${exampleNames.join("|")}>\nSet PORT and HOST to override the default 127.0.0.1:3000.`

export const main = async (argv: readonly string[] = process.argv): Promise<void> => {
  const requested = argv[2] ?? "counter"

  if (!isExampleName(requested)) {
    console.error(usage())
    process.exitCode = 1
    return
  }

  const server = await startExampleServer(requested, {
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? "3000")
  })

  console.log(`Datastar Kit ${requested} example listening on ${server.origin}`)

  const shutdown = async () => {
    await server.close()
    process.exit(0)
  }

  process.once("SIGINT", shutdown)
  process.once("SIGTERM", shutdown)
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
