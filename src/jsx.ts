import type { HtmlChild, HtmlNode, HtmlProps, HtmlPropValue } from "./html.js"
import { h } from "./html.js"

/**
 * Internal JSX element result accepted by the automatic runtime.
 *
 * @internal
 */
export type JsxElement = HtmlNode | readonly HtmlChild[]

/**
 * Internal JSX props accepted by intrinsic HTML elements.
 *
 * @internal
 */
export type JsxProps = Readonly<Record<string, HtmlPropValue | HtmlChild | readonly HtmlChild[]>>

/**
 * Internal props passed to function components by the JSX runtime.
 *
 * @internal
 */
export type JsxComponentProps = Readonly<Record<string, unknown>> & {
  readonly children?: HtmlChild | readonly HtmlChild[]
}

/**
 * Internal function component signature used by the JSX runtime.
 *
 * @internal
 */
export type JsxComponent = (props: JsxComponentProps) => JsxElement

/**
 * Internal JSX tag input accepted by the automatic runtime.
 *
 * @internal
 */
export type JsxTag = string | typeof Fragment | JsxComponent

/**
 * Preserves React-compatible single-child semantics for function component props.
 */
const childrenProp = (children: readonly HtmlChild[]): HtmlChild | readonly HtmlChild[] | undefined => {
  if (children.length === 0) {
    return undefined
  }
  if (children.length === 1) {
    return children[0]
  }
  return children
}

/**
 * Compiler-only JSX fragment component.
 *
 * @internal
 * @param props Fragment children supplied by the JSX transform.
 * @returns The children as a renderable array.
 */
export const Fragment = (props: { readonly children?: HtmlChild | readonly HtmlChild[] }): readonly HtmlChild[] => {
  const children = props.children
  if (children === undefined) {
    return []
  }
  return Array.isArray(children) ? children : [children]
}

/**
 * Maps common JSX prop aliases onto HTML attribute names before serialization.
 */
const normalizePropName = (key: string): string => {
  if (key === "className") return "class"
  if (key === "htmlFor") return "for"
  return key
}

/**
 * Keeps intrinsic element props serializable by the HTML renderer.
 */
const isPropValue = (value: unknown): value is HtmlPropValue =>
  value === null || value === undefined || typeof value === "string" || typeof value === "number" || typeof value === "boolean"

/**
 * Removes compiler-only props and rejects unsupported intrinsic prop values early.
 */
const cleanElementProps = (input: Readonly<Record<string, unknown>> | null): HtmlProps => {
  const cleaned: Record<string, HtmlPropValue> = {}

  for (const [key, value] of Object.entries(input ?? {})) {
    if (key === "__self" || key === "__source" || key === "children") {
      continue
    }

    const propName = normalizePropName(key)
    if (key === "className" && cleaned.class !== undefined) {
      continue
    }

    if (!isPropValue(value)) {
      throw new TypeError(`Unsupported JSX prop value for ${JSON.stringify(key)}`)
    }

    cleaned[propName] = value
  }

  return cleaned
}

/**
 * Keeps component props close to JSX input while normalizing children.
 */
const cleanComponentProps = (input: Readonly<Record<string, unknown>> | null, children: readonly HtmlChild[]): JsxComponentProps => {
  const cleaned: Record<string, unknown> & { children?: HtmlChild | readonly HtmlChild[] } = {}

  for (const [key, value] of Object.entries(input ?? {})) {
    if (key === "__self" || key === "__source" || key === "children") {
      continue
    }
    cleaned[key] = value
  }

  const child = childrenProp(children)
  if (child !== undefined) {
    cleaned.children = child
  }

  return cleaned
}

/**
 * Compiler-only factory used by `jsx-runtime` and `jsx-dev-runtime`.
 *
 * @internal
 * @param tag Intrinsic tag, fragment marker, or function component.
 * @param input Raw JSX props from the compiler.
 * @param children Normalized JSX children.
 * @returns An HTML node or fragment children.
 */
export const createJsxElement = (
  tag: JsxTag,
  input: Readonly<Record<string, unknown>> | null,
  children: readonly HtmlChild[]
): JsxElement => {
  if (tag === Fragment) {
    return children
  }

  if (typeof tag === "function") {
    return tag(cleanComponentProps(input, children))
  }

  return h(tag, cleanElementProps(input), ...children)
}
