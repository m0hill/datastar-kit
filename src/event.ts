import { render, type Child } from "./html.js"
import {
  executeScript,
  patchElements,
  patchSignals,
  type ExecuteScriptOptions,
  type JsonObject,
  type PatchElementsOptions,
  type PatchSignalsOptions
} from "./sse.js"

export const patch = (elements: Child, options?: PatchElementsOptions): string =>
  patchElements(render(elements), options)

export const signals = (
  value: JsonObject | string,
  options?: PatchSignalsOptions
): string => patchSignals(value, options)

export const script = (code: string, options?: ExecuteScriptOptions): string =>
  executeScript(code, options)
