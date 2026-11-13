import type { HtmlChild } from "./html.js"
import { createJsxElement, Fragment, type JsxInput, type JsxTag } from "./jsx.js"

/**
 * Compiler-only JSX fragment export for the automatic development JSX runtime.
 *
 * @internal
 */
export { Fragment }
export type { JSX } from "./jsx-runtime.js"

/**
 * Compiler-only entrypoint for TypeScript's automatic development JSX runtime.
 *
 * @internal
 * @param tag Intrinsic tag or function component, `Fragment` included.
 * @param input Props supplied by the JSX transform.
 * @param _key JSX key consumed by the compiler/runtime boundary.
 * @param _isStaticChildren Development-runtime static children flag.
 * @param _source Development-runtime source metadata.
 * @param _self Development-runtime receiver metadata.
 * @returns A Datastar Kit HTML node or fragment.
 */
export const jsxDEV = (
  tag: JsxTag,
  input: JsxInput | null,
  _key?: string | number,
  _isStaticChildren?: boolean,
  _source?: unknown,
  _self?: unknown
): HtmlChild => createJsxElement(tag, input)
