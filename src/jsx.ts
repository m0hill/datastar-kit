import type { AttributeValue, Attributes, Child, HtmlNode } from "./html.js"
import { fragment, h } from "./html.js"

export type JsxElement = HtmlNode | readonly Child[]
export type JsxAttributes = Readonly<Record<string, AttributeValue | Child | readonly Child[]>>
export type JsxComponentProps = Readonly<Record<string, unknown>> & {
  readonly children?: Child | readonly Child[]
}
export type JsxComponent = (props: never) => JsxElement
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

const normalizeAttrName = (key: string): string => key === "className" ? "class" : key

const cleanAttrs = (attrs: JsxAttributes | null): Attributes => {
  const cleaned: Record<string, AttributeValue> = {}

  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (key === "__self" || key === "__source" || key === "children") {
      continue
    }

    const attrName = normalizeAttrName(key)
    if (key === "className" && cleaned.class !== undefined) {
      continue
    }

    cleaned[attrName] = value as AttributeValue
  }

  return cleaned
}

const cleanProps = (attrs: Readonly<Record<string, unknown>> | null, children: readonly Child[]): JsxComponentProps => {
  const cleaned: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (key === "__self" || key === "__source" || key === "children") {
      continue
    }
    cleaned[key] = value
  }

  const child = childrenProp(children)
  if (child !== undefined) {
    cleaned.children = child
  }

  return cleaned as JsxComponentProps
}

export function jsx(tag: typeof Fragment, attrs: null, ...children: readonly Child[]): readonly Child[]
export function jsx(tag: string, attrs: JsxAttributes | null, ...children: readonly Child[]): HtmlNode
export function jsx<P extends object>(
  tag: (props: P) => JsxElement,
  attrs: Omit<P, "children"> | null,
  ...children: readonly Child[]
): JsxElement
export function jsx(tag: JsxTag, attrs: Readonly<Record<string, unknown>> | null, ...children: readonly Child[]): JsxElement {
  if (tag === Fragment) {
    return fragment(...children)
  }

  if (typeof tag === "function") {
    const component = tag as (props: JsxComponentProps) => JsxElement
    return component(cleanProps(attrs, children))
  }

  return h(tag, cleanAttrs(attrs as JsxAttributes | null), ...children)
}

declare global {
  namespace JSX {
    type Element = JsxElement
    interface ElementChildrenAttribute {
      children: {}
    }
    interface IntrinsicElements {
      [tagName: string]: JsxAttributes
    }
  }
}
