import type { HtmlChild } from "./html.js"
import { createJsxElement, Fragment, type JsxElement, type JsxProps, type JsxTag } from "./jsx.js"

/**
 * Compiler-only JSX fragment export for the automatic JSX runtime.
 *
 * @internal
 */
export { Fragment }

/**
 * Normalizes compiler-provided JSX children into the renderer's child array shape.
 */
const toChildren = (value: HtmlChild | readonly HtmlChild[] | undefined): readonly HtmlChild[] => {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

/**
 * Removes props consumed by the JSX compiler before they reach HTML serialization.
 */
const withoutRuntimeProps = (input: Readonly<Record<string, unknown>> | null): Readonly<Record<string, unknown>> | null => {
  if (input === null || input === undefined) return null

  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (key === "children" || key === "key") continue
    cleaned[key] = value
  }
  return cleaned
}

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
  input: (Readonly<Record<string, unknown>> & { readonly children?: HtmlChild | readonly HtmlChild[] }) | null,
  _key?: string | number
): JsxElement => createJsxElement(tag, withoutRuntimeProps(input), toChildren(input?.children))

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
  export type Element = JsxElement
  /** Tells TypeScript that JSX children are passed through a `children` prop. */
  export interface ElementChildrenAttribute {
    children: {}
  }
  /** Compiler-managed attributes accepted by all JSX elements. */
  export interface IntrinsicAttributes {
    key?: string | number
  }
  /** Intrinsic HTML element props accepted by this runtime. */
  export interface IntrinsicElements {
    [tagName: string]: JsxProps
  }
}
