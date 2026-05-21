import type { PatchElementsMode, PatchElementsNamespace } from "../sse.js"
import { raw, toJs, type DatastarFunction, type Expr, type ExprInput } from "./expression.js"
import type { SignalStateInput } from "./signals.js"

/**
 * Datastar signal filter used by signal display, signal patch, and fetch action helpers.
 */
export interface SignalFilter {
  /** Regular expression or expression selecting signal paths to include. */
  readonly include?: Expr<RegExp> | string
  /** Regular expression or expression selecting signal paths to exclude. */
  readonly exclude?: Expr<RegExp> | string
}

/**
 * Overrides Datastar direct-response handling for a fetch action.
 */
export interface FetchActionResponseOverrides {
  /** CSS selector used when the response is handled as an element patch. */
  readonly selector?: string
  /** Patch mode used when merging elements into the DOM. */
  readonly mode?: PatchElementsMode
  /** Markup namespace used to parse returned markup. */
  readonly namespace?: PatchElementsNamespace
  /** Whether to wrap the DOM update in a native browser View Transition. */
  readonly useViewTransition?: boolean
  /** Whether missing signal keys only should be patched. */
  readonly onlyIfMissing?: boolean
}

/**
 * Options accepted by Datastar fetch actions such as `@get()` and `@post()`.
 *
 * @see https://data-star.dev/reference/actions#get
 */
export interface FetchActionOptions {
  /** CSS selector for a form when `contentType` is `"form"`; `null` uses the closest form. */
  readonly selector?: string | null
  /** Headers sent with the fetch request. */
  readonly headers?: Readonly<Record<string, string>>
  /** Request encoding used by Datastar. @defaultValue `"json"` */
  readonly contentType?: "json" | "form"
  /** Signals included in JSON requests. */
  readonly filterSignals?: SignalFilter
  /** Whether `GET` streams stay open while the page is hidden. */
  readonly openWhenHidden?: boolean
  /** Explicit JSON signal payload sent instead of Datastar's filtered signal state. */
  readonly payload?: SignalStateInput
  /** Overrides direct-response headers observed by Datastar's fetch action. */
  readonly responseOverrides?: FetchActionResponseOverrides
  /** Retry policy for failed requests. @defaultValue `"auto"` */
  readonly retry?: "auto" | "error" | "always" | "never"
  /** Initial retry interval in milliseconds. @defaultValue `1000` */
  readonly retryInterval?: number
  /** Multiplier applied to retry wait times. @defaultValue `2` */
  readonly retryScaler?: number
  /** Maximum wait between retries. @defaultValue `30000` */
  readonly retryMaxWait?: number
  /** Maximum retry attempt count. @defaultValue `10` */
  readonly retryMaxCount?: number
  /** Request cancellation behavior or a custom abort controller expression. @defaultValue `"auto"` */
  readonly requestCancellation?: "auto" | "cleanup" | "disabled" | Expr<AbortController>
}

const fetchOptionKeys = [
  "selector",
  "headers",
  "contentType",
  "filterSignals",
  "openWhenHidden",
  "payload",
  "responseOverrides",
  "retry",
  "retryInterval",
  "retryScaler",
  "retryMaxWait",
  "retryMaxCount",
  "requestCancellation"
] as const

const fetchResponseOverridesToJs = (overrides: FetchActionResponseOverrides): string => {
  const entries: string[] = []

  if (overrides.selector !== undefined) entries.push(`selector: ${toJs(overrides.selector)}`)
  if (overrides.mode !== undefined) entries.push(`mode: ${toJs(overrides.mode)}`)
  if (overrides.namespace !== undefined) entries.push(`namespace: ${toJs(overrides.namespace)}`)
  if (overrides.useViewTransition !== undefined) entries.push(`useViewTransition: ${toJs(overrides.useViewTransition)}`)
  if (overrides.onlyIfMissing !== undefined) entries.push(`onlyIfMissing: ${toJs(overrides.onlyIfMissing)}`)

  return `{${entries.join(", ")}}`
}

const fetchOptionsToJs = (options: FetchActionOptions): string => {
  const entries: string[] = []

  for (const key of fetchOptionKeys) {
    if (key === "responseOverrides") {
      const value = options.responseOverrides
      if (value !== undefined) entries.push(`${key}: ${fetchResponseOverridesToJs(value)}`)
      continue
    }

    const value = options[key]
    if (value !== undefined) entries.push(`${key}: ${toJs(value)}`)
  }

  return `{${entries.join(", ")}}`
}

const escapeTemplateText = (value: string): string => value.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("${", "\\${")

const urlToJs = (url: ExprInput<string>): string => typeof url === "string" ? JSON.stringify(url) : url.toDatastarExpression()

const fetchAction = (method: "get" | "post" | "put" | "patch" | "delete", url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => {
  if (options === undefined || Object.keys(options).length === 0) {
    return raw(`@${method}(${urlToJs(url)})`)
  }

  return raw(`@${method}(${urlToJs(url)}, ${fetchOptionsToJs(options)})`)
}

const datastarAction = <T = unknown>(name: string, ...args: ReadonlyArray<ExprInput<unknown>>): Expr<T> =>
  raw(`@${name}(${args.map((arg) => toJs(arg)).join(", ")})`)

/**
 * Builds a Datastar expression for a URL with reactive query parameters.
 *
 * @param path Base path or URL.
 * @param params Query parameter expressions or literal values.
 * @returns A Datastar expression that evaluates to a URL string.
 */
export const queryUrl = (path: string, params: Readonly<Record<string, ExprInput<string | number | boolean>>>): Expr<string> => {
  const entries = Object.entries(params)
  if (entries.length === 0) {
    return raw(JSON.stringify(path))
  }

  const separator = path.includes("?") ? "&" : "?"
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${"${encodeURIComponent("}${toJs(value)}${")}"}`)
    .join("&")
  return raw(`\`${escapeTemplateText(path)}${separator}${query}\``)
}

/** Creates a Datastar `@get()` action expression. @see https://data-star.dev/reference/actions#get */
export const get = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => fetchAction("get", url, options)

/** Creates a Datastar `@post()` action expression. @see https://data-star.dev/reference/actions#post */
export const post = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => fetchAction("post", url, options)

/** Creates a Datastar `@put()` action expression. @see https://data-star.dev/reference/actions#put */
export const put = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => fetchAction("put", url, options)

/** Creates a Datastar `@patch()` action expression. @see https://data-star.dev/reference/actions#patch */
export const patch = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => fetchAction("patch", url, options)

/** Creates a Datastar `@delete()` action expression. @see https://data-star.dev/reference/actions#delete */
export const del = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => fetchAction("delete", url, options)

/** Creates a Datastar `@peek()` action expression. @see https://data-star.dev/reference/actions#peek */
export const peek = <T = unknown>(callback: Expr<DatastarFunction<T>>): Expr<T> => datastarAction<T>("peek", callback)

/** Creates a Datastar `@setAll()` action expression. @see https://data-star.dev/reference/actions#setall */
export const setAll = (value: ExprInput<unknown>, filter?: SignalFilter): Expr<void> =>
  filter === undefined ? datastarAction<void>("setAll", value) : datastarAction<void>("setAll", value, filter)

/** Creates a Datastar `@toggleAll()` action expression. @see https://data-star.dev/reference/actions#toggleall */
export const toggleAll = (filter?: SignalFilter): Expr<void> =>
  filter === undefined ? datastarAction<void>("toggleAll") : datastarAction<void>("toggleAll", filter)
