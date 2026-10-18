import type { IncomingMessage, ServerResponse } from "node:http"
import type { Plugin } from "vitest/config"
import * as event from "../../src/event.js"
import { h } from "../../src/html.js"
import * as read from "../../src/read.js"
import * as reply from "../../src/reply.js"

type Route = (request: Request) => Promise<Response>

const toRequest = async (message: IncomingMessage): Promise<Request> => {
  const chunks: Buffer[] = []
  for await (const chunk of message) chunks.push(Buffer.from(chunk))
  const method = message.method ?? "GET"
  const headers = new Headers()
  for (const [name, values] of Object.entries(message.headersDistinct)) {
    for (const value of values ?? []) headers.append(name, value)
  }

  return new Request(new URL(message.url ?? "/", "http://localhost"), {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? null : Buffer.concat(chunks)
  })
}

// Reports what reached the server so tests can check the requests Datastar actions build.
const inspect: Route = async (request) => {
  const url = new URL(request.url)
  const contentType = request.headers.get("content-type") ?? ""
  const body = contentType.includes("x-www-form-urlencoded")
    ? await request.text()
    : JSON.stringify(await read.signals(request))
  url.searchParams.delete("datastar")

  return reply.signals({
    inspected: {
      path: decodeURIComponent(url.pathname),
      query: JSON.stringify(Object.fromEntries(url.searchParams)),
      header: request.headers.get("x-test"),
      contentType,
      body
    }
  })
}

const send = async (response: Response, target: ServerResponse): Promise<void> => {
  response.headers.forEach((value, name) => target.setHeader(name, value))
  target.writeHead(response.status)
  target.end(Buffer.from(await response.arrayBuffer()))
}

// Lets a test keep one action request in flight until it fetches the release route.
let releaseHeld: (() => void) | undefined

const routes = new Map<string, Route>([
  // Echoes the `count` signal Datastar sent, keyed by HTTP method, to check how each method
  // transports signals.
  [
    "/fixtures/echo",
    async (request) => {
      const signals = await read.signals(request)
      const count = signals.count ?? null
      return reply.signals({ echo: { [request.method.toLowerCase()]: count } })
    }
  ],
  [
    "/fixtures/stream",
    async () =>
      reply.stream([
        event.patch(h("ul", { id: "list" }, h("li", {}, "first\nsecond"))),
        event.remove("#gone"),
        event.signals({ streamed: { ok: true } }),
        event.script('window.scriptResult = "</script><!--ok"')
      ])
  ],
  [
    "/fixtures/modes",
    async () =>
      reply.stream([
        event.patch(h("b", {}, "inner"), { selector: "#inner", mode: "inner" }),
        event.patch(h("li", {}, "appended"), { selector: "#items", mode: "append" }),
        event.patch(h("li", {}, "prepended"), { selector: "#items", mode: "prepend" }),
        event.patch(h("hr", { id: "before" }), { selector: "#items", mode: "before" }),
        event.patch(h("hr", { id: "after" }), { selector: "#items", mode: "after" }),
        event.patch(h("p", { id: "replaced" }, "new"), {
          selector: "#replace-me",
          mode: "replace"
        }),
        event.patch(h("circle", { id: "dot", r: 4 }), {
          selector: "#icon",
          mode: "append",
          namespace: "svg"
        })
      ])
  ],
  [
    "/fixtures/preserve",
    async () =>
      reply.patch(
        h("details", { id: "details", "data-preserve-attr": "open" }, h("summary", {}, "server"))
      )
  ],
  [
    "/fixtures/signals-if-missing",
    async () => reply.signals({ kept: "replaced", added: "new" }, { onlyIfMissing: true })
  ],
  [
    "/fixtures/direct-html",
    async () => reply.directHtml(h("p", {}, "patched"), { selector: "#direct-slot", mode: "inner" })
  ],
  ["/fixtures/direct-signals", async () => reply.directSignals({ direct: "applied" })],
  [
    "/fixtures/direct-signals-if-missing",
    async () =>
      reply.directSignals({ directKept: "replaced", directAdded: "new" }, { onlyIfMissing: true })
  ],
  [
    "/fixtures/held",
    async () => {
      await new Promise<void>((resolve) => {
        releaseHeld = resolve
      })
      return reply.done()
    }
  ],
  [
    "/fixtures/release",
    async () => {
      releaseHeld?.()
      return reply.done()
    }
  ]
])

/** Serves Datastar action endpoints built from the SDK's own request and response helpers. */
export const browserFixtureEndpoints: Plugin = {
  name: "datastar-kit-browser-fixture-endpoints",
  configureServer(server) {
    server.middlewares.use((message, response, next) => {
      const { pathname } = new URL(message.url ?? "/", "http://localhost")
      const route = pathname.startsWith("/fixtures/inspect") ? inspect : routes.get(pathname)
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
