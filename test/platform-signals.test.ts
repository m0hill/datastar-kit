import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import * as read from "../src/read.js"
import * as reply from "../src/reply.js"
import { closePlatformListeners, makePlatformListener } from "./platform-listener.js"

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
  await closePlatformListeners()
})

describe("native Effect Platform signal decoding", () => {
  it("decodes POST Datastar signals without converting to a Web Request", async () => {
    const router = Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
      HttpRouter.route(
        "POST",
        "/increment",
        read.signals(CounterSignals).pipe(
          Effect.map(({ count }) => reply.signals({ count: count + 1 }))
        )
      )
    ])))
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/increment`, {
      method: "POST",
      body: JSON.stringify({ count: 9 })
    })

    expect(await response.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":10}\n\n')
  })

  it("decodes GET Datastar query signals natively", async () => {
    const router = Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
      HttpRouter.route(
        "GET",
        "/signals",
        read.signals(CounterSignals).pipe(
          Effect.map(({ count }) => reply.direct.signals({ count }, { onlyIfMissing: true }))
        )
      )
    ])))
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/signals?datastar=${encodeURIComponent('{"count":3}')}`)

    expect(response.headers.get("datastar-only-if-missing")).toBe("true")
    expect(await response.text()).toBe('{"count":3}')
  })

  it("surfaces native signal decode failures in the error channel", async () => {
    const router = Effect.flatten(HttpRouter.toHttpEffect(HttpRouter.addAll([
      HttpRouter.route(
        "POST",
        "/signals",
        Effect.result(read.signals(CounterSignals)).pipe(
          Effect.map((result) => reply.direct.signals({ ok: Result.isSuccess(result) }))
        )
      )
    ])))
    const listener = await makePlatformListener(router)
    const response = await fetch(`${await serveListener(listener)}/signals`, {
      method: "POST",
      body: JSON.stringify({ count: "bad" })
    })

    expect(await response.text()).toBe('{"ok":false}')
  })
})
