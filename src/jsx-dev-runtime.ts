import type { Child } from "./html.js"
import { Fragment, jsx } from "./jsx-runtime.js"
import type { JsxElement, JsxProps, JsxTag } from "./jsx.js"

export { Fragment }

export const jsxDEV = (
  tag: JsxTag,
  input: (Readonly<Record<string, unknown>> & { readonly children?: Child | readonly Child[] }) | null,
  key?: string | number,
  _isStaticChildren?: boolean,
  _source?: unknown,
  _self?: unknown
): JsxElement => jsx(tag, input, key)

export namespace JSX {
  export type Element = JsxElement
  export interface ElementChildrenAttribute {
    children: {}
  }
  export interface IntrinsicAttributes {
    key?: string | number
  }
  export interface IntrinsicElements {
    [tagName: string]: JsxProps
  }
}
