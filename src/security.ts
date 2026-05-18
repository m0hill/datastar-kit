import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import { RequestContext } from "./runtime.js"

export const DEFAULT_CSRF_HEADER = "x-csrf-token"

const unsafeMethods = new Set(["POST", "PUT", "PATCH", "DELETE"])

export class CsrfError extends Error {
  readonly _tag = "CsrfError"

  constructor(readonly reason: "Missing" | "Mismatch") {
    super(reason === "Missing" ? "Missing CSRF token" : "Invalid CSRF token")
  }
}

export interface CsrfOptions {
  readonly headerName?: string
  readonly skipSafeMethods?: boolean
}

export const requireCsrfToken = (
  expectedToken: string,
  options: CsrfOptions = {}
): Effect.Effect<void, CsrfError, RequestContext> =>
  RequestContext.pipe(
    Effect.flatMap((context) => {
      if (options.skipSafeMethods !== false && !unsafeMethods.has(context.method)) {
        return Effect.void
      }

      const headerName = (options.headerName ?? DEFAULT_CSRF_HEADER).toLowerCase()
      const actual = context.request.headers[headerName]

      if (actual === undefined || actual.length === 0) {
        return Effect.fail(new CsrfError("Missing"))
      }

      if (actual !== expectedToken) {
        return Effect.fail(new CsrfError("Mismatch"))
      }

      return Effect.void
    })
  )

export interface AuthContextValue<User = unknown, Session = unknown> {
  readonly user?: User
  readonly session?: Session
}

export class AuthContext extends Context.Service<AuthContext, AuthContextValue>()("ts-star/AuthContext") {}

export const AuthContextLive = <User, Session>(value: AuthContextValue<User, Session>): Layer.Layer<AuthContext> =>
  Layer.succeed(AuthContext)(value)

export class UnauthorizedError extends Error {
  readonly _tag = "UnauthorizedError"

  constructor(message = "Unauthorized") {
    super(message)
  }
}

export const requireUser = <User = unknown>(): Effect.Effect<User, UnauthorizedError, AuthContext> =>
  AuthContext.pipe(
    Effect.flatMap((context) =>
      context.user === undefined
        ? Effect.fail(new UnauthorizedError())
        : Effect.succeed(context.user as User)
    )
  )

export class RequestSizeLimitError extends Error {
  readonly _tag = "RequestSizeLimitError"

  constructor(
    readonly limitBytes: number,
    readonly actualBytes: number | undefined
  ) {
    super(actualBytes === undefined ? `Request body exceeds ${limitBytes} bytes` : `Request body is ${actualBytes} bytes; limit is ${limitBytes}`)
  }
}

const textEncoder = new TextEncoder()

export const requireContentLengthAtMost = (
  limitBytes: number
): Effect.Effect<void, RequestSizeLimitError, RequestContext> =>
  RequestContext.pipe(
    Effect.flatMap((context) => {
      const raw = context.request.headers["content-length"]
      if (raw === undefined) {
        return Effect.void
      }

      const length = Number(raw)
      if (Number.isFinite(length) && length > limitBytes) {
        return Effect.fail(new RequestSizeLimitError(limitBytes, length))
      }

      return Effect.void
    })
  )

export const readLimitedText = (
  limitBytes: number
): Effect.Effect<string, RequestSizeLimitError | unknown, RequestContext> =>
  RequestContext.pipe(
    Effect.flatMap((context) =>
      requireContentLengthAtMost(limitBytes).pipe(
        Effect.andThen(context.request.text),
        Effect.flatMap((body) => {
          const bytes = textEncoder.encode(body).byteLength
          return bytes > limitBytes
            ? Effect.fail(new RequestSizeLimitError(limitBytes, bytes))
            : Effect.succeed(body)
        })
      )
    )
  )

export const requestAbortSignal: Effect.Effect<AbortSignal | undefined, never, RequestContext> = RequestContext.pipe(
  Effect.map((context) => {
    const source = context.request.source
    return source instanceof Request ? source.signal : undefined
  })
)

export class UnsafeRedirectUrlError extends Error {
  readonly _tag = "UnsafeRedirectUrlError"

  constructor(readonly url: string) {
    super(`Unsafe redirect URL: ${JSON.stringify(url)}`)
  }
}

export interface SafeUrlOptions {
  readonly baseUrl?: string
  readonly allowExternal?: boolean
}

const hasControlCharacters = (value: string): boolean => /[\u0000-\u001F\u007F]/u.test(value)

export const safeRedirectUrl = (input: string | URL, options: SafeUrlOptions = {}): string => {
  const raw = input.toString()
  if (hasControlCharacters(raw)) {
    throw new UnsafeRedirectUrlError(raw)
  }

  const base = new URL(options.baseUrl ?? "http://localhost")
  const url = new URL(raw, base)

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeRedirectUrlError(raw)
  }

  if (options.allowExternal !== true && url.origin !== base.origin) {
    throw new UnsafeRedirectUrlError(raw)
  }

  return url.origin === base.origin ? `${url.pathname}${url.search}${url.hash}` : url.toString()
}

export const navigationScript = (url: string | URL, options?: SafeUrlOptions): string =>
  `window.location.href = ${JSON.stringify(safeRedirectUrl(url, options))}`
