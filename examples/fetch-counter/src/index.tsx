import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import type { AddressInfo } from "node:net"
import { pathToFileURL } from "node:url"
import { ds, reply } from "datastar-kit"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

let count = 0

const Count = () => <output id="count" aria-live="polite">{count}</output>

const Counter = () => (
  <main id="counter" class="counter-shell">
    <h1>Fetch counter</h1>
    <p>This handler is plain Web Fetch: it accepts a Request and returns a Response.</p>
    <div class="counter-row">
      <button type="button" {...ds.on("click", ds.post("/increment"))}>Increment</button>
      <Count />
    </div>
  </main>
)

const pageStyles = `
  body {
    color: #17202a;
    font-family: system-ui, sans-serif;
    margin: 0;
  }

  .counter-shell {
    display: grid;
    gap: 1rem;
    margin: 4rem auto;
    max-width: 32rem;
    padding: 0 1rem;
  }

  .counter-row {
    align-items: center;
    display: flex;
    gap: 1rem;
  }

  button {
    border: 1px solid #17202a;
    border-radius: 0.5rem;
    background: #17202a;
    color: white;
    cursor: pointer;
    font: inherit;
    padding: 0.5rem 0.75rem;
  }

  output {
    font-size: 2rem;
    font-variant-numeric: tabular-nums;
    min-width: 3ch;
  }
`

export const handle = (request: Request): Response => {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") {
    return reply.page(<Counter />, {
      title: "Fetch counter",
      head: [
        <script type="module" src={DATASTAR_CDN} />,
        <style>{pageStyles}</style>
      ]
    })
  }

  if (request.method === "POST" && url.pathname === "/increment") {
    count += 1
    return reply.patch(<Count />)
  }

  return new Response("Not Found", { status: 404 })
}

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

export const startServer = async (
  options: { readonly host?: string; readonly port?: number } = {}
): Promise<{ readonly origin: string; readonly server: Server }> => {
  const host = options.host ?? "127.0.0.1"
  const port = options.port ?? 3000
  let origin = `http://${host}:${port}`

  const server = createServer(async (request, response) => {
    try {
      await sendResponse(response, handle(requestFromNode(request, origin)))
    } catch (error) {
      console.error(error)
      response.statusCode = 500
      response.setHeader("content-type", "text/plain; charset=utf-8")
      response.end("Internal Server Error")
    }
  })

  await new Promise<void>((resolve) => {
    server.listen(port, host, () => {
      const address = server.address() as AddressInfo
      origin = `http://${host}:${address.port}`
      resolve()
    })
  })

  return { origin, server }
}

const main = async (): Promise<void> => {
  const { origin, server } = await startServer({
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? "3000")
  })

  console.log(`Fetch counter listening on ${origin}`)

  const shutdown = () => {
    server.close(() => process.exit(0))
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
