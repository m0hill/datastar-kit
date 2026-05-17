import type { AttributeValue, Attributes, Child, HtmlNode } from "./html.js"
import { fragment, h } from "./html.js"

export const Fragment = (_props: { readonly children?: Child | readonly Child[] }): readonly Child[] => []

export type JsxTag = string | typeof Fragment
export type JsxElement = HtmlNode | readonly Child[]
export type JsxAttributes = Readonly<Record<string, AttributeValue | Child | readonly Child[]>>

const cleanAttrs = (attrs: JsxAttributes | null): Attributes => {
  const cleaned: Record<string, AttributeValue> = {}

  for (const [key, value] of Object.entries(attrs ?? {})) {
    if (key === "__self" || key === "__source" || key === "children") {
      continue
    }
    cleaned[key] = value as AttributeValue
  }

  return cleaned
}

export const jsx = (tag: JsxTag, attrs: JsxAttributes | null, ...children: readonly Child[]): JsxElement => {
  if (tag === Fragment) {
    return fragment(...children)
  }

  return h(tag as string, cleanAttrs(attrs), ...children)
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
