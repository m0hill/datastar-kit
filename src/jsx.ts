import type { Child, HtmlNode, Props, PropValue } from "./html.js"
import { fragment, h } from "./html.js"

export type JsxElement = HtmlNode | readonly Child[]
export type JsxProps = Readonly<Record<string, PropValue | Child | readonly Child[]>>
export type JsxComponentProps = Readonly<Record<string, unknown>> & {
  readonly children?: Child | readonly Child[]
}
export type JsxComponent = (props: JsxComponentProps) => JsxElement
export type JsxTag = string | typeof Fragment | JsxComponent

const childrenProp = (children: readonly Child[]): Child | readonly Child[] | undefined => {
  if (children.length === 0) {
    return undefined
  }
  if (children.length === 1) {
    return children[0]
  }
  return children
}

export const Fragment = (props: { readonly children?: Child | readonly Child[] }): readonly Child[] => {
  const children = props.children
  if (children === undefined) {
    return []
  }
  return Array.isArray(children) ? children : [children]
}

const normalizePropName = (key: string): string => key === "className" ? "class" : key

const isPropValue = (value: unknown): value is PropValue =>
  value === null || value === undefined || typeof value === "string" || typeof value === "number" || typeof value === "boolean"

const cleanElementProps = (input: Readonly<Record<string, unknown>> | null): Props => {
  const cleaned: Record<string, PropValue> = {}

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

const cleanComponentProps = (input: Readonly<Record<string, unknown>> | null, children: readonly Child[]): JsxComponentProps => {
  const cleaned: Record<string, unknown> & { children?: Child | readonly Child[] } = {}

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

export function jsx(tag: typeof Fragment, props: null, ...children: readonly Child[]): readonly Child[]
export function jsx(tag: string, props: JsxProps | null, ...children: readonly Child[]): HtmlNode
export function jsx<P extends object>(
  tag: (props: P) => JsxElement,
  props: Omit<P, "children"> | null,
  ...children: readonly Child[]
): JsxElement
export function jsx(tag: JsxTag, input: Readonly<Record<string, unknown>> | null, ...children: readonly Child[]): JsxElement {
  if (tag === Fragment) {
    return fragment(...children)
  }

  if (typeof tag === "function") {
    return tag(cleanComponentProps(input, children))
  }

  return h(tag, cleanElementProps(input), ...children)
}

declare global {
  namespace JSX {
    type Element = JsxElement
    interface ElementChildrenAttribute {
      children: {}
    }
    interface IntrinsicElements {
      [tagName: string]: JsxProps
    }
  }
}
