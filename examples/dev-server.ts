import { NodeHttpServer } from "@effect/platform-node"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Scope from "effect/Scope"
import type * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import type * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { pathToFileURL } from "node:url"
import { app as counterApp } from "./counter.js"
import { createLiveCounter } from "./live-counter.js"
import { runtimeCounterAppWithServices } from "./runtime-counter.js"
import { app as searchApp } from "./search.js"
import { tsxCounterApp } from "./tsx-counter.js"
import { app as validationFormApp } from "./validation-form.js"

export const exampleNames = ["counter", "tsx-counter", "search", "live-counter", "runtime-counter", "validation-form"] as const
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

type ExampleApp = Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  unknown,
  Scope.Scope | HttpServerRequest.HttpServerRequest
>

interface ExampleRuntime {
  readonly app: ExampleApp
  readonly close?: Effect.Effect<void>
}

const isExampleName = (value: string): value is ExampleName =>
  (exampleNames as readonly string[]).includes(value)

const makeExampleRuntime = (name: ExampleName): ExampleRuntime => {
  switch (name) {
    case "counter":
      return { app: counterApp }
    case "tsx-counter":
      return { app: tsxCounterApp }
    case "search":
      return { app: searchApp }
    case "live-counter": {
      const liveCounter = createLiveCounter()
      return { app: liveCounter.app, close: liveCounter.shutdown }
    }
    case "runtime-counter":
      return { app: runtimeCounterAppWithServices }
    case "validation-form":
      return { app: validationFormApp }
  }
}

const closeNodeServer = (server: Server): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error))
  })

export const startExampleServer = async (
  name: ExampleName,
  options: DevServerOptions = {}
): Promise<RunningExampleServer> => {
  const host = options.host ?? "127.0.0.1"
  const port = options.port ?? 3000
  const scope = await Effect.runPromise(Scope.make())
  const runtime = makeExampleRuntime(name)
  const listener = await Effect.runPromise(NodeHttpServer.makeHandler(runtime.app, { scope }))
  const server = createServer(listener)

  await new Promise<void>((resolve) => server.listen(port, host, resolve))

  const address = server.address() as AddressInfo
  let closed = false

  const close = async (): Promise<void> => {
    if (closed) {
      return
    }
    closed = true

    await closeNodeServer(server)
    if (runtime.close !== undefined) {
      await Effect.runPromise(runtime.close)
    }
    await Effect.runPromise(Scope.close(scope, Exit.void))
  }

  return {
    name,
    host,
    port: address.port,
    origin: `http://${host}:${address.port}`,
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

  console.log(`ts-star ${requested} example listening on ${server.origin}`)

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
