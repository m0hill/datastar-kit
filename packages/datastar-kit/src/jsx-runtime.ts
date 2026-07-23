import type { HtmlElements, HtmlGlobalAttributes } from "./html-attributes.js"
import type { HtmlChild } from "./html.js"
import { createJsxElement, type JsxTag } from "./jsx.js"

/**
 * Application-registered attributes accepted by every known JSX intrinsic element.
 *
 * Augment this interface in `datastar-kit/jsx-runtime` for custom HTML attributes and Datastar
 * plugins. Registration gives the attribute an exact value type despite TypeScript deliberately
 * permitting unknown hyphenated JSX attribute names.
 */
export interface CustomJsxAttributes {}

/**
 * Application-registered custom elements and their exact JSX props.
 *
 * Augment this interface in `datastar-kit/jsx-runtime`. Registered elements also receive global
 * HTML and ARIA attributes, typed Datastar attributes, children, and every property from
 * {@link CustomJsxAttributes}.
 */
export interface CustomJsxElements {}

type KnownIntrinsicElements = {
  [Tag in keyof HtmlElements]: HtmlElements[Tag] & CustomJsxAttributes
}

type CustomElementGlobalAttributes = HtmlGlobalAttributes<HTMLElement> & CustomJsxAttributes

type RegisteredCustomElements = {
  [Tag in keyof CustomJsxElements]: CustomJsxElements[Tag] & CustomElementGlobalAttributes
}

const toChildren = (value: HtmlChild | readonly HtmlChild[] | undefined): readonly HtmlChild[] => {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Compiler-only JSX fragment export for the automatic JSX runtime.
 *
 * @internal
 */
export { Fragment } from "./jsx.js"

/**
 * Compiler-only entrypoint for TypeScript's automatic JSX runtime.
 *
 * @internal
 * @param tag Intrinsic tag, fragment marker, or function component.
 * @param input Props supplied by the JSX transform.
 * @param _key JSX key consumed by the compiler/runtime boundary.
 * @returns A Datastar Kit HTML node or fragment.
 */
export const jsx = (
  tag: JsxTag,
  input:
    | (Readonly<Record<string, unknown>> & { readonly children?: HtmlChild | readonly HtmlChild[] })
    | null,
  _key?: string | number
): HtmlChild => createJsxElement(tag, input, toChildren(input?.children))

/**
 * Compiler-only entrypoint for JSX calls with static children.
 *
 * @internal
 */
export const jsxs = jsx

/**
 * TypeScript JSX namespace for `jsxImportSource: "datastar-kit"`.
 *
 * @internal
 */
export namespace JSX {
  /** Renderable JSX element type. */
  export type Element = HtmlChild
  /** Tells TypeScript that JSX children are passed through a `children` prop. */
  export interface ElementChildrenAttribute {
    children: {}
  }
  /** Compiler-managed attributes accepted by all JSX elements. */
  export interface IntrinsicAttributes {
    key?: string | number
  }
  /**
   * Intrinsic HTML element props accepted by this runtime.
   *
   * Known HTML and SVG tags get typed attributes and editor autocomplete. Unregistered custom
   * element names must contain a hyphen and retain loose props. Augment {@link CustomJsxElements}
   * to give a custom element exact element-specific, global HTML, ARIA, and Datastar props.
   */
  export interface IntrinsicElements extends KnownIntrinsicElements, RegisteredCustomElements {
    [tagName: `${string}-${string}`]: unknown
  }
}
