import { renderToString, type HtmlChild } from "./html.js"
import { navigationScript, type NavigationSafetyOptions } from "./navigation.js"
import {
  executeScript as encodeExecuteScript,
  patchElements as encodePatchElements,
  patchSignals as encodePatchSignals,
  type ExecuteScriptOptions,
  type PatchElementsOptions,
  type PatchSignalsOptions,
  type SignalState
} from "./sse.js"

export { NavigationUrlError } from "./navigation.js"

/** Options for a safe navigation event chunk. */
export type NavigateOptions = ExecuteScriptOptions & NavigationSafetyOptions

/** Renders HTML and encodes it as one Datastar patch-elements SSE event chunk. */
export const patch = (elements: HtmlChild, options?: PatchElementsOptions): string =>
  encodePatchElements(renderToString(elements), options)

/** Encodes signal state as one Datastar patch-signals SSE event chunk. */
export const signals = (value: SignalState, options?: PatchSignalsOptions): string =>
  encodePatchSignals(value, options)

/**
 * Encodes trusted JavaScript as one Datastar script execution SSE event chunk.
 * Prefer structured element or signal patches when possible.
 */
export const script = (code: string, options?: ExecuteScriptOptions): string =>
  encodeExecuteScript(code, options)

/**
 * Encodes a safe browser navigation as one Datastar SSE event chunk.
 */
export const navigate = (url: string | URL, options: NavigateOptions = {}): string => {
  const { baseUrl, allowedOrigins, ...scriptOptions } = options
  return encodeExecuteScript(
    navigationScript(url, {
      ...(baseUrl === undefined ? {} : { baseUrl }),
      ...(allowedOrigins === undefined ? {} : { allowedOrigins })
    }),
    scriptOptions
  )
}
