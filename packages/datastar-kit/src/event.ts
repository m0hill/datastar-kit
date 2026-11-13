import { renderToString, type HtmlChild } from "./html.js"
import { navigationScript, type NavigationSafetyOptions } from "./navigation.js"
import {
  executeScript,
  patchElements,
  type ExecuteScriptOptions,
  type PatchElementsOptions
} from "./sse.js"

export { NavigationUrlError } from "./navigation.js"
export { SseFieldError } from "./sse.js"
export {
  comment,
  executeScript as script,
  patchSignals as signals,
  removeElements as remove,
  type RemoveElementsOptions as RemoveOptions
} from "./sse.js"

/** Options for a safe navigation event chunk. */
export type NavigateOptions = ExecuteScriptOptions & NavigationSafetyOptions

/** Renders HTML and encodes it as one Datastar patch-elements SSE event chunk. */
export const patch = (elements: HtmlChild, options?: PatchElementsOptions): string =>
  patchElements(renderToString(elements), options)

/**
 * Encodes a safe browser navigation as one Datastar SSE event chunk.
 */
export const navigate = (url: string | URL, options: NavigateOptions = {}): string =>
  executeScript(navigationScript(url, options), options)
