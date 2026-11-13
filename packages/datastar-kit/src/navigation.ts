/**
 * Safe URL options shared by Datastar navigation helpers.
 */
export interface NavigationSafetyOptions {
  /** Base URL used to resolve relative navigation targets. @defaultValue `"http://localhost"` */
  readonly baseUrl?: string | URL
  /** Additional absolute origins allowed for cross-origin navigation. */
  readonly allowedOrigins?: readonly (string | URL)[]
}

/**
 * Error thrown when Datastar navigation helpers reject an unsafe navigation target.
 */
export class NavigationUrlError extends Error {
  /**
   * @param url The unsafe URL input that was rejected.
   */
  constructor(readonly url: string) {
    super(`Unsafe navigation URL: ${JSON.stringify(url)}`)
  }
}

// A misspelled allowlist entry would otherwise just never match, so it fails loudly instead.
const allowedOrigins = (options: NavigationSafetyOptions): string[] =>
  (options.allowedOrigins ?? []).map((origin) => {
    const allowed = URL.parse(origin.toString())
    if (allowed === null || (allowed.protocol !== "http:" && allowed.protocol !== "https:")) {
      throw new TypeError(`Invalid allowed navigation origin: ${JSON.stringify(origin.toString())}`)
    }
    return allowed.origin
  })

/**
 * Normalizes navigation targets and rejects cross-origin or non-HTTP(S) URLs by default.
 */
export const safeNavigationUrl = (
  input: string | URL,
  options: NavigationSafetyOptions = {}
): string => {
  const raw = input.toString()
  const allowed = allowedOrigins(options)
  if (/[\u0000-\u001F\u007F]/u.test(raw)) {
    throw new NavigationUrlError(raw)
  }

  let base: URL
  let url: URL
  try {
    base = new URL(options.baseUrl?.toString() ?? "http://localhost")
    url = new URL(raw, base)
  } catch {
    throw new NavigationUrlError(raw)
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new NavigationUrlError(raw)
  }

  if (url.origin === base.origin) {
    return `${url.pathname}${url.search}${url.hash}`
  }

  if (allowed.includes(url.origin)) {
    return url.toString()
  }

  throw new NavigationUrlError(raw)
}

export const navigationScript = (
  url: string | URL,
  options: NavigationSafetyOptions = {}
): string =>
  `setTimeout(() => { window.location.href = ${JSON.stringify(safeNavigationUrl(url, options))} })`
