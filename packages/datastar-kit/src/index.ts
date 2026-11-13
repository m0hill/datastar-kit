/** Type-safe primitive custom `data-*` attribute helpers. */
export { dataAttrs } from "./data-attributes.js"
export type { DataAttributes } from "./data-attributes.js"
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
export { h, HtmlNameError, renderToString, unsafeHtml } from "./html.js"
export type { HtmlChild, HtmlNode, HtmlProps, HtmlPropValue } from "./html.js"
/** @internal Compiler-only factory for an element whose `key` follows a spread. */
export { createElement } from "./jsx.js"
export type { JsxProps } from "./jsx.js"
export type { CustomJsxAttributes, CustomJsxElements } from "./jsx-runtime.js"
export type { SignalState, SignalValue } from "./types.js"
