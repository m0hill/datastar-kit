import type { Child } from "./html.js"
import { createJsxElement, Fragment, type JsxElement, type JsxProps, type JsxTag } from "./jsx.js"

export { Fragment }

const toChildren = (value: Child | readonly Child[] | undefined): readonly Child[] => {
  if (value === undefined) return []
  return Array.isArray(value) ? value : [value]
}

const withoutRuntimeProps = (input: Readonly<Record<string, unknown>> | null): Readonly<Record<string, unknown>> | null => {
  if (input === null || input === undefined) return null

  const cleaned: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (key === "children" || key === "key") continue
    cleaned[key] = value
  }
  return cleaned
}

export const jsx = (
  tag: JsxTag,
  input: (Readonly<Record<string, unknown>> & { readonly children?: Child | readonly Child[] }) | null,
  _key?: string | number
): JsxElement => createJsxElement(tag, withoutRuntimeProps(input), toChildren(input?.children))

export const jsxs = jsx

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
