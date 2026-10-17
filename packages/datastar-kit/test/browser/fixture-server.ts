import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin } from "vitest/config"
import * as event from "../../src/event.js"
import { h } from "../../src/html.js"
import * as read from "../../src/read.js"
import * as reply from "../../src/reply.js"

// Datastar sends signals in the URL or body, so the fixture only needs the method, URL, and body.
const toRequest = async (message: IncomingMessage): Promise<Request> => {
  const chunks: Buffer[] = []
  for await (const chunk of message) chunks.push(Buffer.from(chunk))
  const method = message.method ?? "GET"

  return new Request(new URL(message.url ?? "/", "http://localhost"), {
    method,
    body: method === "GET" || method === "HEAD" ? null : Buffer.concat(chunks)
  })
}

const send = async (response: Response, target: ServerResponse): Promise<void> => {
  response.headers.forEach((value, name) => target.setHeader(name, value))
  target.writeHead(response.status)
  target.end(Buffer.from(await response.arrayBuffer()))
}

type Route = (request: Request) => Promise<Response>

const routes = new Map<string, Route>([
  // Echoes the `count` signal Datastar sent, keyed by HTTP method, to check how each method
  // transports signals.
  [
    "/fixtures/runtime/echo",
    async (request) => {
      const signals = await read.signals(request)
      const count = signals.count ?? null
      return reply.signals({ echo: { [request.method.toLowerCase()]: count } })
    }
  ],
  [
    "/fixtures/runtime/stream",
    async () =>
      reply.stream([
        event.patch(h("ul", { id: "list" }, h("li", {}, "first\nsecond"))),
        event.patch(null, { selector: "#gone", mode: "remove" }),
        event.signals({ streamed: { ok: true } }),
        event.script('window.scriptResult = "</script><!--ok"')
      ])
  ],
  [
    "/fixtures/runtime/direct-html",
    async () => reply.directHtml(h("p", {}, "patched"), { selector: "#direct-slot", mode: "inner" })
  ],
  ["/fixtures/runtime/direct-signals", async () => reply.directSignals({ direct: "applied" })]
])

/** Serves Datastar action endpoints built from the SDK's own request and response helpers. */
export const browserFixtureEndpoints: Plugin = {
  name: "datastar-kit-browser-fixture-endpoints",
  configureServer(server) {
    server.middlewares.use((message, response, next) => {
      const route = routes.get(new URL(message.url ?? "/", "http://localhost").pathname)
      if (route === undefined) {
        next()
        return
      }

      void toRequest(message)
        .then(route)
        .then((result) => send(result, response))
        .catch(next)
    })
  }
}
