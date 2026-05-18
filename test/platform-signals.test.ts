import * as HttpRouter from "@effect/platform/HttpRouter"
import { NodeHttpServer } from "@effect/platform-node"
import * as Effect from "effect/Effect"
import * as Either from "effect/Either"
import * as Schema from "effect/Schema"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { platformJsonSignalsResponse, platformPatchSignalsResponse, platformReadSignals } from "../src/platform.js"

const CounterSignals = Schema.Struct({
  count: Schema.Number
})

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
})

describe("native Effect Platform signal decoding", () => {
  it("decodes POST Datastar signals without converting to a Web Request", async () => {
    const router = HttpRouter.post(
      HttpRouter.empty,
      "/increment",
      platformReadSignals(CounterSignals).pipe(
        Effect.map(({ count }) => platformPatchSignalsResponse({ count: count + 1 }))
      )
    )
    const listener = await Effect.runPromise(NodeHttpServer.makeHandler(router))
    const response = await fetch(`${await serveListener(listener)}/increment`, {
      method: "POST",
      body: JSON.stringify({ count: 9 })
    })

    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":10}\n\n')
  })

  it("decodes GET Datastar query signals natively", async () => {
    const router = HttpRouter.get(
      HttpRouter.empty,
      "/signals",
      platformReadSignals(CounterSignals).pipe(
        Effect.map(({ count }) => platformJsonSignalsResponse({ count }, { onlyIfMissing: true }))
      )
    )
    const listener = await Effect.runPromise(NodeHttpServer.makeHandler(router))
    const response = await fetch(`${await serveListener(listener)}/signals?datastar=${encodeURIComponent('{"count":3}')}`)

    expect(response.headers.get("datastar-only-if-missing")).toBe("true")
    expect(await response.text()).toBe('{"count":3}')
  })

  it("surfaces native signal decode failures in the error channel", async () => {
    const router = HttpRouter.post(
      HttpRouter.empty,
      "/signals",
      Effect.either(platformReadSignals(CounterSignals)).pipe(
        Effect.map((result) => platformJsonSignalsResponse({ ok: Either.isRight(result) }))
      )
    )
    const listener = await Effect.runPromise(NodeHttpServer.makeHandler(router))
    const response = await fetch(`${await serveListener(listener)}/signals`, {
      method: "POST",
      body: JSON.stringify({ count: "bad" })
    })

    expect(await response.text()).toBe('{"ok":false}')
  })
})
