/// <reference types="node" />
import type { IncomingMessage, ServerResponse } from "node:http"
import { Readable } from "node:stream"
import { pipeline } from "node:stream/promises"
import type { ReadableStream as NodeReadableStream } from "node:stream/web"

export type FetchHandler = (request: Request) => Response | Promise<Response>

// Express adds a parsed `body` and the pre-mount `originalUrl`.
export type NodeRequest = IncomingMessage & {
  readonly body?: unknown
  readonly originalUrl?: string
}

const bodylessMethods = new Set(["GET", "HEAD"])

const requestHeaders = (req: IncomingMessage): Headers => {
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (value === undefined) continue
    for (const item of Array.isArray(value) ? value : [value]) headers.append(name, item)
  }
  return headers
}

const requestBody = (req: NodeRequest): BodyInit | null => {
  if (bodylessMethods.has(req.method ?? "GET")) return null
  // Express 4 body parsers set `req.body = {}` even for requests they skip, so only a consumed
  // stream proves the body was parsed.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Node and DOM type the same web stream separately.
  if (!req.readableEnded) return Readable.toWeb(req) as ReadableStream<Uint8Array>
  if (typeof req.body === "string") return req.body
  if (req.body instanceof Uint8Array) return Uint8Array.from(req.body)
  return JSON.stringify(req.body)
}

const isTlsSocket = (req: IncomingMessage): boolean =>
  "encrypted" in req.socket && req.socket.encrypted === true

const toRequest = (req: NodeRequest, res: ServerResponse): Request => {
  const controller = new AbortController()
  res.once("close", () => {
    if (!res.writableFinished) controller.abort()
  })

  const protocol = isTlsSocket(req) ? "https" : "http"
  const url = new URL(
    req.originalUrl ?? req.url ?? "/",
    `${protocol}://${req.headers.host ?? "localhost"}`
  )
  const body = requestBody(req)

  return new Request(url, {
    method: req.method ?? "GET",
    headers: requestHeaders(req),
    signal: controller.signal,
    ...(body === null ? {} : { body, duplex: "half" })
  })
}

const sendResponse = async (res: ServerResponse, response: Response): Promise<void> => {
  res.statusCode = response.status
  res.statusMessage = response.statusText

  const setCookies = response.headers.getSetCookie()
  response.headers.forEach((value, name) => {
    if (name !== "set-cookie") res.setHeader(name, value)
  })
  if (setCookies.length > 0) res.setHeader("set-cookie", setCookies)

  if (response.body === null) {
    res.end()
    return
  }

  res.flushHeaders()
  try {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Node and DOM type the same web stream separately.
    await pipeline(Readable.fromWeb(response.body as NodeReadableStream), res)
  } catch (error) {
    if (!res.destroyed) throw error
  }
}

export const nodeHandler =
  (handler: FetchHandler) =>
  async (req: NodeRequest, res: ServerResponse, next?: (error: unknown) => void): Promise<void> => {
    try {
      await sendResponse(res, await handler(toRequest(req, res)))
    } catch (error) {
      if (next !== undefined) {
        next(error)
        return
      }
      console.error(error)
      if (!res.headersSent) {
        res.statusCode = 500
        res.end()
      } else {
        res.destroy(error instanceof Error ? error : undefined)
      }
    }
  }
