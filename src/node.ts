import * as Effect from "effect/Effect"
import type { IncomingMessage, RequestListener, ServerResponse } from "node:http"
import type { Handler } from "./handler.js"

const hasRequestBody = (method: string | undefined): boolean => {
  const normalized = method?.toUpperCase() ?? "GET"
  return normalized !== "GET" && normalized !== "HEAD"
}

const readIncomingBody = (request: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Array<Buffer> = []

    request.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk)
    })
    request.on("end", () => resolve(Buffer.concat(chunks)))
    request.on("error", reject)
  })

export const incomingHeaders = (request: IncomingMessage): Headers => {
  const headers = new Headers()

  for (const [key, value] of Object.entries(request.headers)) {
    if (value === undefined) {
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item)
      }
      continue
    }

    headers.set(key, value)
  }

  return headers
}

const bufferToBody = (buffer: Buffer): BodyInit =>
  buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer

export const nodeRequestToWeb = async (request: IncomingMessage, origin?: string): Promise<Request> => {
  const headers = incomingHeaders(request)
  const base = origin ?? `http://${headers.get("host") ?? "localhost"}`
  const url = new URL(request.url ?? "/", base)
  const init: RequestInit = {
    method: request.method ?? "GET",
    headers
  }

  if (hasRequestBody(request.method)) {
    const body = await readIncomingBody(request)
    if (body.length > 0) {
      init.body = bufferToBody(body)
    }
  }

  return new Request(url.toString(), init)
}

export const writeWebResponse = async (target: ServerResponse, response: Response): Promise<void> => {
  target.statusCode = response.status
  if (response.statusText.length > 0) {
    target.statusMessage = response.statusText
  }

  response.headers.forEach((value, key) => {
    target.setHeader(key, value)
  })

  if (response.body === null) {
    target.end()
    return
  }

  target.end(Buffer.from(await response.arrayBuffer()))
}

export interface NodeListenerOptions {
  readonly origin?: string
  readonly onError?: (cause: unknown) => Response
}

const defaultErrorResponse = (): Response =>
  new Response("Internal Server Error", {
    status: 500,
    headers: {
      "content-type": "text/plain; charset=utf-8"
    }
  })

export const createNodeListener = (app: Handler<unknown, any>, options: NodeListenerOptions = {}): RequestListener =>
(request, response) => {
  const program = Effect.promise(() => nodeRequestToWeb(request, options.origin)).pipe(
    Effect.flatMap(app)
  ) as Effect.Effect<Response, unknown, never>

  Effect.runPromise(program)
    .catch((cause: unknown) => options.onError?.(cause) ?? defaultErrorResponse())
    .then((webResponse) => writeWebResponse(response, webResponse))
    .catch((cause: unknown) => {
      if (!response.headersSent) {
        response.statusCode = 500
      }
      response.end(String(cause))
    })
}
