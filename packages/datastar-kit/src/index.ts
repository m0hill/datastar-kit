/** Type-safe primitive custom `data-*` attribute helpers. */
export { dataAttrs } from "./data-attributes.js"
export type { DataAttributes } from "./data-attributes.js"
/** Validation issue mapping for form error signals. */
export { fieldErrors } from "./form-errors.js"
export type { FieldErrors, FieldErrorShape } from "./form-errors.js"
/** Datastar action, signal, expression, and modifier helpers. */
export * from "./ds/index.js"
/** SSE event chunk helpers for `reply.stream()`. */
export * as event from "./event.js"
/** Request-boundary Datastar signal readers. */
export * as read from "./read.js"
/** Native `Response` helpers for Datastar handlers. */
export * as reply from "./reply.js"

export type {
  AriaAttributes,
  AriaRole,
  HtmlElements,
  HtmlGlobalAttributes,
  HtmlVoidGlobalAttributes,
  SvgElementAttributes
} from "./html-attributes.js"
export { h, renderToString, unsafeHtml } from "./html.js"
export type { HtmlChild, HtmlNode, HtmlProps, HtmlPropValue } from "./html.js"
export type { JsxProps } from "./jsx.js"
export type { CustomJsxAttributes, CustomJsxElements } from "./jsx-runtime.js"
export type { StandardSchemaV1 } from "./standard-schema.js"
export type { SignalState, SignalValue } from "./types.js"
