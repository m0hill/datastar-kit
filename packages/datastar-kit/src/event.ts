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
