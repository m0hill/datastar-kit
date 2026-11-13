import { raw, toJs, type DatastarFunction, type Expr, type ExprInput } from "./expression.js"
import type { SignalFilter } from "./attribute-types.js"
import type { SignalStateInput } from "./signals.js"

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

// A record, not a list, so adding an option to FetchActionOptions fails here until it is rendered.
// Only these keys render, so a stray runtime key cannot reach the Datastar expression.
const fetchOptionNames = {
  selector: true,
  headers: true,
  contentType: true,
  filterSignals: true,
  openWhenHidden: true,
  payload: true,
  retry: true,
  retryInterval: true,
  retryScaler: true,
  retryMaxWait: true,
  retryMaxCount: true,
  requestCancellation: true
} satisfies Record<keyof FetchActionOptions, true>

const isFetchOptionKey = (key: string): key is keyof FetchActionOptions =>
  Object.hasOwn(fetchOptionNames, key)

const fetchOptionKeys = Object.keys(fetchOptionNames).filter(isFetchOptionKey)

const escapeTemplateText = (value: string): string =>
  value.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("${", "\\${")

const splitHash = (path: string) => {
  const hashIndex = path.indexOf("#")
  if (hashIndex === -1) {
    return { beforeHash: path, hash: "" }
  }

  return {
    beforeHash: path.slice(0, hashIndex),
    hash: path.slice(hashIndex)
  }
}

const querySeparator = (path: string): string => {
  if (!path.includes("?")) {
    return "?"
  }

  return path.endsWith("?") || path.endsWith("&") ? "" : "&"
}

const fetchAction = (
  method: "get" | "post" | "put" | "patch" | "query" | "delete",
  url: ExprInput<string>,
  options: FetchActionOptions = {}
): Expr<void> => {
  const entries = fetchOptionKeys
    .filter((key) => options[key] !== undefined)
    .map((key) => `${key}: ${toJs(options[key])}`)
  const args = entries.length === 0 ? toJs(url) : `${toJs(url)}, {${entries.join(", ")}}`
  return raw(`@${method}(${args})`)
}

export class ActionNameError extends Error {
  constructor(readonly actionName: string) {
    super(`Invalid Datastar action name: ${JSON.stringify(actionName)}`)
  }
}

const actionNamePattern = /^[A-Za-z_$][\w$]*$/

const assertActionName = (name: string): void => {
  if (!actionNamePattern.test(name)) {
    throw new ActionNameError(name)
  }
}

/**
 * Builds a Datastar expression for a URL with reactive query parameters.
 *
 * @param path Base path or URL.
 * @param params Query parameter expressions or literal values.
 * @returns A Datastar expression that evaluates to a URL string.
 */
export const queryUrl = (
  path: string,
  params: Readonly<Record<string, ExprInput<string | number | boolean>>>
): Expr<string> => {
  const entries = Object.entries(params)
  if (entries.length === 0) {
    return raw(JSON.stringify(path))
  }

  const { beforeHash, hash } = splitHash(path)
  const separator = querySeparator(beforeHash)
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=\${encodeURIComponent(${toJs(value)})}`)
    .join("&")
  return raw(`\`${escapeTemplateText(beforeHash)}${separator}${query}${escapeTemplateText(hash)}\``)
}

/** Creates a Datastar `@get()` action expression. @see https://data-star.dev/reference/actions#get */
export const get = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> =>
  fetchAction("get", url, options)

/** Creates a Datastar `@post()` action expression. @see https://data-star.dev/reference/actions#post */
export const post = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> =>
  fetchAction("post", url, options)

/** Creates a Datastar `@put()` action expression. @see https://data-star.dev/reference/actions#put */
export const put = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> =>
  fetchAction("put", url, options)

/** Creates a Datastar `@patch()` action expression. @see https://data-star.dev/reference/actions#patch */
export const patch = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> =>
  fetchAction("patch", url, options)

/**
 * Creates a Datastar `@query()` action expression, which sends an HTTP `QUERY` request with the
 * signals in the request body. Requires Datastar 1.0.4 or newer.
 *
 * @see https://data-star.dev/reference/actions#query
 */
export const query = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> =>
  fetchAction("query", url, options)

/** Creates a Datastar `@delete()` action expression. @see https://data-star.dev/reference/actions#delete */
export const del = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> =>
  fetchAction("delete", url, options)

/**
 * Creates a Datastar `@peek()` action expression.
 *
 * @see https://data-star.dev/reference/actions#peek
 */
export const peek = <T = unknown>(callable: Expr<DatastarFunction<T>>): Expr<T> =>
  action<T>("peek", callable)

/** Creates a Datastar `@setAll()` action expression. @see https://data-star.dev/reference/actions#setall */
export const setAll = (value: ExprInput<unknown>, filter?: SignalFilter): Expr<void> =>
  filter === undefined ? action("setAll", value) : action("setAll", value, filter)

/** Creates a Datastar `@toggleAll()` action expression. @see https://data-star.dev/reference/actions#toggleall */
export const toggleAll = (filter?: SignalFilter): Expr<void> =>
  filter === undefined ? action("toggleAll") : action("toggleAll", filter)

/**
 * Creates an expression for an app-defined Datastar action such as `@myAction(...)`.
 *
 * Register the browser action with Datastar's `action(...)` plugin API, then call it from
 * server-rendered attributes without writing the full inline expression string by hand.
 */
export const action = <T = unknown>(
  name: string,
  ...args: ReadonlyArray<ExprInput<unknown>>
): Expr<T> => {
  assertActionName(name)
  return raw(`@${name}(${args.map((arg) => toJs(arg)).join(", ")})`)
}
