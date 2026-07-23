import { normalizeDatastarAttribute } from "./ds/attribute-authoring.js"
import type { DatastarAttributeValue } from "./ds/attribute-types.js"
import type { HtmlChild, HtmlProps, HtmlPropValue } from "./html.js"
import { h } from "./html.js"

/**
 * Loosely typed prop bag accepted by the low-level JSX runtime boundary.
 */
export type JsxProps = Readonly<
  Record<string, HtmlPropValue | HtmlChild | readonly HtmlChild[] | DatastarAttributeValue>
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
export type JsxComponent = (props: JsxComponentProps) => HtmlChild

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

const cleanElementProps = (input: Readonly<Record<string, unknown>> | null): HtmlProps => {
  const cleaned: Record<string, HtmlPropValue> = {}

  for (const [key, value] of Object.entries(input ?? {})) {
    if (key === "__self" || key === "__source" || key === "children" || key === "key") {
      continue
    }

    const propName = normalizePropName(key)
    const prop = normalizeDatastarAttribute(propName, value)
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
    if (key === "__self" || key === "__source" || key === "children" || key === "key") {
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
): HtmlChild => {
  if (tag === Fragment) {
    return children
  }

  if (typeof tag === "function") {
    return tag(cleanComponentProps(input, children))
  }

  return h(tag, cleanElementProps(input), ...children)
}
