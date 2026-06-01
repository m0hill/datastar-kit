import type { HtmlChild, HtmlNode, HtmlProps, HtmlPropValue } from "./html.js"
import { h } from "./html.js"
import { isExpr, toJs, type Expr } from "./ds/expression.js"
import { Signal } from "./ds/signals.js"

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
type DatastarJsxValue =
  | HtmlPropValue
  | Expr
  | readonly DatastarJsxValue[]
  | { readonly [key: string]: DatastarJsxValue }

export type JsxProps = Readonly<
  Record<string, HtmlPropValue | HtmlChild | readonly HtmlChild[] | DatastarJsxValue>
>

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

const childrenProp = (
  children: readonly HtmlChild[]
): HtmlChild | readonly HtmlChild[] | undefined => {
  if (children.length === 0) {
    return undefined
  }
  if (children.length === 1) {
    return children[0]
  }
  return children
}

const normalizePropName = (key: string): string => {
  if (key === "className") return "class"
  if (key === "htmlFor") return "for"
  return key
}

const isPropValue = (value: unknown): value is HtmlPropValue =>
  value === null ||
  value === undefined ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"

const isDatastarAttribute = (name: string): boolean => name.startsWith("data-")

const datastarAttributeRoot = (name: string): string => name.split("__", 1)[0] ?? name

const isDatastarExpressionAttribute = (name: string): boolean => {
  const root = datastarAttributeRoot(name)
  return (
    root === "data-signals" ||
    root.startsWith("data-signals:") ||
    root === "data-computed" ||
    root.startsWith("data-computed:") ||
    root === "data-attr" ||
    root.startsWith("data-attr:") ||
    root === "data-class" ||
    root.startsWith("data-class:") ||
    root === "data-style" ||
    root.startsWith("data-style:") ||
    root === "data-init" ||
    root === "data-effect" ||
    root === "data-text" ||
    root === "data-show" ||
    root === "data-on-intersect" ||
    root === "data-on-interval" ||
    root === "data-on-signal-patch" ||
    root.startsWith("data-on:")
  )
}

const isDatastarSignalNameAttribute = (name: string): boolean =>
  name === "data-bind" ||
  name.startsWith("data-bind__") ||
  name === "data-ref" ||
  name.startsWith("data-ref__") ||
  name === "data-indicator" ||
  name.startsWith("data-indicator__")

const isDatastarSerializableValue = (name: string, value: unknown): boolean =>
  isExpr(value) ||
  Array.isArray(value) ||
  (typeof value === "object" && value !== null) ||
  (isDatastarExpressionAttribute(name) &&
    (typeof value === "number" || typeof value === "boolean" || value === null))

const cleanDatastarProp = (
  name: string,
  value: unknown
): { readonly name: string; readonly value: unknown } => {
  if (!isDatastarAttribute(name) || !isDatastarSerializableValue(name, value)) {
    return { name, value }
  }

  if (value instanceof Signal && isDatastarSignalNameAttribute(name)) {
    return { name, value: value.name }
  }

  return { name, value: toJs(value as DatastarJsxValue) }
}

const cleanElementProps = (input: Readonly<Record<string, unknown>> | null): HtmlProps => {
  const cleaned: Record<string, HtmlPropValue> = {}

  for (const [key, value] of Object.entries(input ?? {})) {
    if (key === "__self" || key === "__source" || key === "children") {
      continue
    }

    const propName = normalizePropName(key)
    const prop = cleanDatastarProp(propName, value)
    if (key === "className" && cleaned.class !== undefined) {
      continue
    }

    if (!isPropValue(prop.value)) {
      throw new TypeError(`Unsupported JSX prop value for ${JSON.stringify(key)}`)
    }

    cleaned[prop.name] = prop.value
  }

  return cleaned
}

const cleanComponentProps = (
  input: Readonly<Record<string, unknown>> | null,
  children: readonly HtmlChild[]
): JsxComponentProps => {
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
 * Compiler-only JSX fragment component.
 *
 * @internal
 * @param props Fragment children supplied by the JSX transform.
 * @returns The children as a renderable array.
 */
export const Fragment = (props: {
  readonly children?: HtmlChild | readonly HtmlChild[]
}): readonly HtmlChild[] => {
  const children = props.children
  if (children === undefined) {
    return []
  }
  return Array.isArray(children) ? children : [children]
}

/**
 * Internal JSX tag input accepted by the automatic runtime.
 *
 * @internal
 */
export type JsxTag = string | typeof Fragment | JsxComponent

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
