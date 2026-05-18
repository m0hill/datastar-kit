import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { runtimeCounterAppWithServices } from "../examples/runtime-counter.js"
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

describe("Effect services counter example", () => {
  it("assembles an app from normal Effect domain services", async () => {
    const listener = await makePlatformListener(runtimeCounterAppWithServices)
    const origin = await serveListener(listener)

    const page = await fetch(origin)
    const html = await page.text()
    expect(page.status).toBe(200)
    expect(html).toContain("Effect services counter")
    expect(html).toContain('data-signals__ifmissing="{&quot;count&quot;: 0}"')

    const increment = await fetch(`${origin}/increment`, {
      method: "POST",
      headers: { "datastar-request": "true" },
      body: JSON.stringify({ count: 0 })
    })

    expect(increment.status).toBe(200)
    expect(await increment.text()).toBe('event: datastar-patch-signals\ndata: signals {"count":1}\n\n')
  })
})
