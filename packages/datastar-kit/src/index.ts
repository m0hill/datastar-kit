/** Type-safe primitive custom `data-*` attribute helpers. */
export { dataAttrs } from "./data-attributes.js"
export type { DataAttributes } from "./data-attributes.js"
/** Datastar action, signal, expression, and modifier helpers. */
export * from "./ds/index.js"
/** SSE event chunk helpers for `reply.stream()`. */
export * as event from "./event.js"
/** Request-boundary helpers: decode, validate, and group validation issues. */
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
export { Fragment, h } from "./element.js"
export type { ElementFactory, ElementTagFunctions } from "./element.js"
export { HtmlNameError, renderToString, unsafeHtml } from "./html.js"
export type { HtmlChild, HtmlNode, HtmlProps, HtmlPropValue } from "./html.js"
/**
 * @internal The classic factory TypeScript and esbuild import for a JSX element whose `key`
 * follows a spread. It is `h()`.
 */
export { h as createElement } from "./element.js"
export type { JsxProps } from "./element.js"
export type {
  CustomJsxAttributes,
  CustomJsxElements,
  IntrinsicElementProps
} from "./jsx-runtime.js"
export type { SignalState, SignalValue } from "./types.js"
