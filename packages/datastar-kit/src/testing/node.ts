/// <reference types="node" />

import { createServer, type IncomingHttpHeaders, type Server, type ServerResponse } from "node:http"
import type {
  DatastarFlight,
  DatastarFlightAssertions,
  DatastarFlightRecorder,
  DatastarFlightRecorderOptions,
  DatastarResponseInspectionOptions
} from "./types.js"
import { assertDatastarFlight } from "./assertions.js"
import { mergeDatastarFlights, createDatastarFlightRecorder } from "./recorder.js"

export type DatastarFetchHandler = (request: Request) => Response | Promise<Response>

export interface DatastarBrowserRecorderInjectionOptions {
  /** Global property that receives the browser recorder installation. */
  readonly globalName?: string
  /** User event names to record from elements with `data-on:*` attributes. Defaults to common UI events. */
  readonly userEvents?: readonly string[] | false
  /** Whether to record Datastar's `datastar-signal-patch` browser event. @defaultValue `true` */
  readonly signalPatches?: boolean
  /** Whether to record DOM mutation summaries. @defaultValue `true` */
  readonly domMutations?: boolean
  /** Predicate deciding which HTML responses receive the recorder script. Defaults to every HTML response. */
  readonly include?: (request: Request, response: Response) => boolean
}

export interface DatastarBrowserTestServerOptions {
  /** Fetch-compatible app handler under test. */
  readonly fetch: DatastarFetchHandler
  /** Hostname used by the ephemeral test server. @defaultValue `"127.0.0.1"` */
  readonly hostname?: string
  /** Port used by the ephemeral test server. `0` asks the OS for a free port. @defaultValue `0` */
  readonly port?: number
  /** Existing server-side recorder to write into. A new recorder is created when omitted. */
  readonly recorder?: DatastarFlightRecorder
  /** Recorder options used when `recorder` is omitted. */
  readonly recorderOptions?: DatastarFlightRecorderOptions
  /** Per-response inspection options for server-side response recording. */
  readonly inspectResponse?: DatastarResponseInspectionOptions
  /** Browser recorder injection options. Pass `false` to serve HTML without recorder injection. */
  readonly browserRecorder?: DatastarBrowserRecorderInjectionOptions | false
}

export interface DatastarBrowserPageLike {
  evaluate<T = unknown>(expression: string): Promise<T>
  waitForFunction?(expression: string): Promise<unknown>
}

export interface DatastarBrowserTestServer {
  readonly origin: string
  readonly url: string
  readonly recorder: DatastarFlightRecorder
  close(): Promise<void>
  browserFlight(page: DatastarBrowserPageLike): Promise<DatastarFlight>
  flight(page: DatastarBrowserPageLike): Promise<DatastarFlight>
  assert(page: DatastarBrowserPageLike): Promise<DatastarFlightAssertions>
}

const defaultBrowserRecorderGlobal = "__datastarKitFlightRecorder"
const defaultBrowserUserEvents = ["click", "submit", "input", "change"] as const

const responseIsHtml = (response: Response): boolean =>
  response.headers.get("content-type")?.toLowerCase().includes("text/html") ?? false

const nodeHeadersToWebHeaders = (headers: IncomingHttpHeaders): Headers => {
  const webHeaders = new Headers()

  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue
    if (Array.isArray(value)) {
      for (const item of value) webHeaders.append(key, item)
    } else {
      webHeaders.set(key, value)
    }
  }

  return webHeaders
}

const requestBody = async (request: AsyncIterable<Buffer>): Promise<ArrayBuffer | undefined> => {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(chunk)
  if (chunks.length === 0) return undefined

  const buffer = Buffer.concat(chunks)
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)
}

type NodeIncomingRequest = AsyncIterable<Buffer> & {
  readonly method?: string | undefined
  readonly url?: string | undefined
  readonly headers: IncomingHttpHeaders
}

const requestFromNode = async (request: NodeIncomingRequest, origin: string): Promise<Request> => {
  const method = request.method ?? "GET"
  const body = method === "GET" || method === "HEAD" ? undefined : await requestBody(request)

  return new Request(new URL(request.url ?? "/", origin), {
    method,
    headers: nodeHeadersToWebHeaders(request.headers),
    ...(body === undefined ? {} : { body })
  })
}

const writeResponse = async (target: ServerResponse, response: Response): Promise<void> => {
  target.statusCode = response.status
  target.statusMessage = response.statusText
  response.headers.forEach((value, key) => target.setHeader(key, value))

  if (response.body === null) {
    target.end()
    return
  }

  const reader = response.body.getReader()
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) {
        target.end()
        return
      }
      target.write(Buffer.from(result.value))
    }
  } catch (error) {
    target.destroy(error instanceof Error ? error : new Error(String(error)))
  } finally {
    reader.releaseLock()
  }
}

const browserRecorderScript = (options: DatastarBrowserRecorderInjectionOptions = {}): string => {
  const globalName = options.globalName ?? defaultBrowserRecorderGlobal
  const userEvents =
    options.userEvents === undefined ? defaultBrowserUserEvents : options.userEvents
  const signalPatches = options.signalPatches !== false
  const domMutations = options.domMutations !== false

  return `<script>
(() => {
  const globalName = ${JSON.stringify(globalName)}
  if (globalThis[globalName] !== undefined) return

  const events = []
  const cleanup = []
  const isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value)
  const describeNode = (node) => {
    if (node instanceof Text) return "text " + JSON.stringify(node.textContent ?? "")
    if (node instanceof Document) return "#document"
    if (node instanceof Element) {
      const tag = node.tagName.toLowerCase()
      const id = node.id.length === 0 ? "" : "#" + node.id
      return tag + id
    }
    return "node"
  }
  const nodeSnapshot = (node) => node instanceof Element ? node.outerHTML : node.textContent ?? describeNode(node)
  const record = (event) => events.push(event)
  const datastarAttribute = (element) => {
    const name = element.getAttributeNames().find((item) => item.startsWith("data-on:"))
    if (name === undefined) return undefined
    const expression = element.getAttribute(name) ?? undefined
    return { datastarAttribute: name, ...(expression === undefined ? {} : { expression }) }
  }

  const userEvents = ${JSON.stringify(userEvents)}
  if (userEvents !== false) {
    for (const eventName of userEvents) {
      const listener = (event) => {
        let node = event.target
        while (node !== null && node !== undefined) {
          if (node instanceof Element) {
            const datastar = datastarAttribute(node)
            if (datastar !== undefined) {
              record({ type: "browser.user", event: event.type, target: describeNode(node), ...datastar })
              return
            }
          }
          node = node.parentElement
        }
      }
      document.addEventListener(eventName, listener, true)
      cleanup.push(() => document.removeEventListener(eventName, listener, true))
    }
  }

  if (${JSON.stringify(signalPatches)}) {
    const listener = (event) => {
      const detail = event.detail
      if (isRecord(detail)) {
        record({ type: "browser.signal.patch", signals: detail })
      } else {
        record({ type: "browser.signal.patch", signalError: { name: "SignalShapeError", message: "Datastar signals must be a JSON object", input: detail } })
      }
    }
    document.addEventListener("datastar-signal-patch", listener)
    cleanup.push(() => document.removeEventListener("datastar-signal-patch", listener))
  }

  if (${JSON.stringify(domMutations)} && "MutationObserver" in globalThis) {
    const observer = new MutationObserver((records) => {
      const mutations = records.map((record) => ({
        type: record.type,
        target: describeNode(record.target),
        ...(record.attributeName == null ? {} : { attributeName: record.attributeName }),
        ...(record.oldValue == null ? {} : { oldValue: record.oldValue }),
        ...(record.type === "childList" ? {
          addedNodes: Array.from(record.addedNodes, nodeSnapshot),
          removedNodes: Array.from(record.removedNodes, nodeSnapshot)
        } : {}),
        ...(record.type === "characterData" ? { text: record.target.textContent ?? "" } : {})
      }))
      if (mutations.length > 0) record({ type: "browser.dom.mutation", mutations })
    })
    observer.observe(document.documentElement ?? document.body, {
      attributeOldValue: true,
      attributes: true,
      characterData: true,
      characterDataOldValue: true,
      childList: true,
      subtree: true
    })
    cleanup.push(() => observer.disconnect())
  }

  globalThis[globalName] = {
    recorder: {
      flight: () => ({ events: events.slice() }),
      clear: () => { events.length = 0 }
    },
    flush: () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0))),
    uninstall: () => {
      for (const dispose of cleanup.splice(0)) dispose()
    }
  }
})()
</script>`
}

const injectBrowserRecorder = (
  html: string,
  options: DatastarBrowserRecorderInjectionOptions = {}
): string => {
  const globalName = options.globalName ?? defaultBrowserRecorderGlobal
  if (html.includes(globalName)) return html

  const script = browserRecorderScript(options)
  const datastarRuntime = /<script\b(?=[^>]*\bsrc=(['"])[^'"]*datastar[^'"]*\1)[^>]*>/iu.exec(html)
  if (datastarRuntime !== null) {
    return `${html.slice(0, datastarRuntime.index)}${script}${html.slice(datastarRuntime.index)}`
  }

  const headClose = /<\/head\s*>/iu.exec(html)
  if (headClose !== null)
    return `${html.slice(0, headClose.index)}${script}${html.slice(headClose.index)}`

  return `${script}${html}`
}

const responseWithBrowserRecorder = async (
  request: Request,
  response: Response,
  options: DatastarBrowserRecorderInjectionOptions | false | undefined
): Promise<Response> => {
  if (options === false || !responseIsHtml(response)) return response
  if (options?.include !== undefined && !options.include(request, response)) return response

  const headers = new Headers(response.headers)
  headers.delete("content-length")

  return new Response(injectBrowserRecorder(await response.text(), options), {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}

export const waitForDatastarBrowserRecorder = async (
  page: DatastarBrowserPageLike,
  globalName = defaultBrowserRecorderGlobal
): Promise<void> => {
  if (page.waitForFunction !== undefined) {
    await page.waitForFunction(`globalThis[${JSON.stringify(globalName)}] !== undefined`)
    return
  }

  await page.evaluate(`(async () => {
    const deadline = Date.now() + 2000
    while (Date.now() < deadline && globalThis[${JSON.stringify(globalName)}] === undefined) {
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
    if (globalThis[${JSON.stringify(globalName)}] === undefined) {
      throw new Error("Datastar browser recorder was not installed")
    }
  })()`)
}

export const datastarBrowserFlight = async (
  page: DatastarBrowserPageLike,
  globalName = defaultBrowserRecorderGlobal
): Promise<DatastarFlight> => {
  await page.evaluate(`globalThis[${JSON.stringify(globalName)}].flush()`)
  return page.evaluate<DatastarFlight>(
    `globalThis[${JSON.stringify(globalName)}].recorder.flight()`
  )
}

export const createDatastarBrowserTestServer = async (
  options: DatastarBrowserTestServerOptions
): Promise<DatastarBrowserTestServer> => {
  const hostname = options.hostname ?? "127.0.0.1"
  const port = options.port ?? 0
  const recorder =
    options.recorder ??
    createDatastarFlightRecorder(options.recorderOptions ?? { source: "server" })

  let origin = ""
  const server = createServer(async (nodeRequest, nodeResponse) => {
    try {
      const request = await requestFromNode(nodeRequest, origin)
      const response = await recorder.handle(
        request,
        (handlerRequest) => options.fetch(handlerRequest),
        options.inspectResponse
      )
      await writeResponse(
        nodeResponse,
        await responseWithBrowserRecorder(request, response, options.browserRecorder)
      )
    } catch (error) {
      const response = new Response(error instanceof Error ? error.message : String(error), {
        status: 500
      })
      await writeResponse(nodeResponse, response)
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(port, hostname, () => {
      server.off("error", reject)
      resolve()
    })
  })

  const address = server.address()
  if (typeof address !== "object" || address === null) {
    await closeServer(server)
    throw new Error("Expected Datastar browser test server to listen on a TCP address")
  }
  origin = `http://${hostname}:${address.port}`

  const close = (): Promise<void> => closeServer(server)
  const browserFlight = (page: DatastarBrowserPageLike): Promise<DatastarFlight> =>
    datastarBrowserFlight(
      page,
      options.browserRecorder === false ? undefined : options.browserRecorder?.globalName
    )
  const flight = async (page: DatastarBrowserPageLike): Promise<DatastarFlight> =>
    mergeDatastarFlights([recorder.flight(), await browserFlight(page)])

  return {
    origin,
    url: origin,
    recorder,
    close,
    browserFlight,
    flight,
    async assert(page) {
      return assertDatastarFlight(await flight(page))
    }
  }
}

const closeServer = async (server: Server): Promise<void> => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error === undefined ? resolve() : reject(error)))
  )
}
