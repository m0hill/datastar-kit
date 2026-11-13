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
 * Props from the JSX compiler, children included. Components receive the same shape.
 *
 * @internal
 */
export type JsxInput = Readonly<Record<string, unknown>> & {
  readonly children?: HtmlChild | readonly HtmlChild[]
}

/**
 * Internal function component signature used by the JSX runtime.
 *
 * @internal
 */
export type JsxComponent = (props: JsxInput) => HtmlChild

/** @internal Props the compiler adds; they are not element attributes or component props. */
export const compilerProps = new Set(["__self", "__source", "key"])

// React-style names and the HTML attribute each one renders as. When both are written, the HTML
// name wins, whichever comes first.
const propAliases = { className: "class", htmlFor: "for" } as const

const isAliasedProp = (key: string): key is keyof typeof propAliases =>
  Object.hasOwn(propAliases, key)

const isPropValue = (value: unknown): value is HtmlPropValue =>
  value === null ||
  value === undefined ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"

const elementProps = (input: JsxInput | null): HtmlProps => {
  const cleaned: Record<string, HtmlPropValue> = {}

  for (const [key, value] of Object.entries(input ?? {})) {
    if (compilerProps.has(key) || key === "children") continue
    const alias = isAliasedProp(key) ? propAliases[key] : undefined
    if (alias !== undefined && input?.[alias] !== undefined) continue

    const prop = normalizeDatastarAttribute(alias ?? key, value)
    if (!isPropValue(prop.value)) {
      throw new TypeError(`Unsupported JSX prop value for ${JSON.stringify(key)}`)
    }

    cleaned[prop.name] = prop.value
  }

  return cleaned
}

const componentProps = (input: JsxInput | null): JsxInput =>
  Object.fromEntries(Object.entries(input ?? {}).filter(([key]) => !compilerProps.has(key)))

const childList = (
  children: HtmlChild | readonly HtmlChild[] | undefined
): readonly HtmlChild[] => {
  if (children === undefined) return []
  return Array.isArray(children) ? children : [children]
}

/**
 * Compiler-only JSX fragment component.
 *
 * @internal
 * @param props Fragment children supplied by the JSX transform.
 * @returns The children, unchanged.
 */
export const Fragment = (props: {
  readonly children?: HtmlChild | readonly HtmlChild[]
}): HtmlChild => props.children

/**
 * Internal JSX tag input accepted by the automatic runtime.
 *
 * @internal
 */
export type JsxTag = string | JsxComponent

/**
 * Compiler-only factory used by `jsx-runtime` and `jsx-dev-runtime`.
 *
 * @internal
 * @param tag Intrinsic tag or function component, `Fragment` included.
 * @param input Raw JSX props from the compiler, children included.
 * @returns An HTML node or whatever the component renders.
 */
export const createJsxElement = (tag: JsxTag, input: JsxInput | null): HtmlChild =>
  typeof tag === "function"
    ? tag(componentProps(input))
    : h(tag, elementProps(input), ...childList(input?.children))
