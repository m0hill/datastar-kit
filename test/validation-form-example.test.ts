import { createServer, type RequestListener, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { afterEach, describe, expect, it } from "vitest"
import { app, contactFormView } from "../examples/validation-form.js"
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

describe("validation form example", () => {
  it("renders input and validation signals without trusting them as durable state", () => {
    expect(contactFormView()).toContain('data-signals__ifmissing="{&quot;name&quot;: &quot;&quot;, &quot;email&quot;: &quot;&quot;}"')
    expect(contactFormView()).toContain('data-text="$_validation.email"')
  })

  it("returns 200 validation patches for recoverable form errors", async () => {
    const listener = await makePlatformListener(app)
    const origin = await serveListener(listener)
    const response = await fetch(`${origin}/contact`, {
      method: "POST",
      body: JSON.stringify({ name: "", email: "bad" })
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      'event: datastar-patch-signals\ndata: signals {"_validation":{"form":"Please fix the highlighted fields","name":"Name is required","email":"Email must contain @"}}\n\n'
    )
  })

  it("returns success patches for valid form submissions", async () => {
    const listener = await makePlatformListener(app)
    const origin = await serveListener(listener)
    const response = await fetch(`${origin}/contact`, {
      method: "POST",
      body: JSON.stringify({ name: "Ada", email: "ada@example.com" })
    })

    expect(response.status).toBe(200)
    expect(await response.text()).toBe(
      'event: datastar-patch-elements\ndata: selector #contact-result\ndata: elements <div id="contact-result" role="status">Saved Ada &lt;ada@example.com&gt;</div>\n\n'
    )
  })

  it("maps malformed signal payloads to explicit decode errors", async () => {
    const listener = await makePlatformListener(app)
    const origin = await serveListener(listener)
    const response = await fetch(`${origin}/contact`, {
      method: "POST",
      body: JSON.stringify({ name: 1, email: "ada@example.com" })
    })

    expect(response.status).toBe(400)
    expect(await response.text()).toBe("Invalid request input")
  })
})
