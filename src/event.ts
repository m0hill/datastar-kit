import { renderToString, type HtmlChild } from "./html.js"
import {
  executeScript as encodeExecuteScript,
  patchElements as encodePatchElements,
  patchSignals as encodePatchSignals,
  type ExecuteScriptOptions,
  type PatchElementsOptions,
  type PatchSignalsOptions,
  type SignalState
} from "./sse.js"

/**
 * Renders HTML and encodes it as one Datastar patch-elements SSE event chunk.
 *
 * @param elements HTML child tree to patch into the browser document.
 * @param options Datastar patch-elements event options.
 * @returns A complete SSE event chunk for `reply.stream()`.
 * @see https://data-star.dev/reference/sse_events#datastar-patch-elements
 */
export const patchElements = (elements: HtmlChild, options?: PatchElementsOptions): string =>
  encodePatchElements(renderToString(elements), options)

/**
 * Encodes signal state as one Datastar patch-signals SSE event chunk.
 *
 * @param value Signal state or a pre-encoded signal patch string.
 * @param options Datastar patch-signals event options.
 * @returns A complete SSE event chunk for `reply.stream()`.
 * @see https://data-star.dev/reference/sse_events#datastar-patch-signals
 */
export const patchSignals = (
  value: SignalState | string,
  options?: PatchSignalsOptions
): string => encodePatchSignals(value, options)

/**
 * Encodes JavaScript as one Datastar script execution SSE event chunk.
 *
 * @remarks
 * This is a trust-boundary escape hatch. Only pass script text produced by trusted application
 * code, and prefer structured element or signal patches when possible.
 *
 * @param code JavaScript source to execute in the browser.
 * @param options Datastar script execution event options.
 * @returns A complete SSE event chunk for `reply.stream()`.
 */
export const executeScript = (code: string, options?: ExecuteScriptOptions): string =>
  encodeExecuteScript(code, options)
