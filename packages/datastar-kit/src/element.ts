import { normalizeDatastarAttribute } from "./ds/attribute-authoring.js"
import type { DatastarAttributeValue } from "./ds/attribute-types.js"
import {
  htmlNode,
  type HtmlChild,
  type HtmlNode,
  type HtmlProps,
  type HtmlPropValue
} from "./html.js"
import { htmlElementTags, reactAttributeAliases, type HtmlElements } from "./html-attributes.js"
import type { IntrinsicElementProps } from "./jsx-runtime.js"

/**
 * Loosely typed props accepted by unregistered hyphenated custom elements, in `h()` and JSX.
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

/** @internal */
export type JsxComponent = (props: JsxInput) => HtmlChild

/** @internal Props the compiler adds; they are not element attributes or component props. */
export const compilerProps = new Set(["__self", "__source", "key"])

const isAliasedProp = (key: string): key is keyof typeof reactAttributeAliases =>
  Object.hasOwn(reactAttributeAliases, key)

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
    // When both a React-style alias and its HTML name are written, the HTML name wins.
    const alias = isAliasedProp(key) ? reactAttributeAliases[key] : undefined
    if (alias !== undefined && input?.[alias] !== undefined) continue

    const prop = normalizeDatastarAttribute(alias ?? key, value)
    if (!isPropValue(prop.value)) {
      throw new TypeError(`Unsupported prop value for ${JSON.stringify(key)}`)
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
 * Fragment component: renders its children with no wrapper element. JSX's `<>...</>` uses it.
 */
export const Fragment = (props: {
  readonly children?: HtmlChild | readonly HtmlChild[]
}): HtmlChild => props.children

/** @internal */
export type JsxTag = string | JsxComponent

/**
 * Builds an element or calls a component from props with children included. `h()`, the JSX
 * runtimes, and `createElement` all end here.
 *
 * @internal
 */
export const buildElement = (tag: JsxTag, input: JsxInput | null): HtmlChild =>
  typeof tag === "function"
    ? tag(componentProps(input))
    : htmlNode(tag, elementProps(input), ...childList(input?.children))

// Children may come positionally, so a component's props need not include them.
type ComponentInput<Props> = Omit<Props, "children"> &
  Partial<Pick<Props, Extract<keyof Props, "children">>>

const withChildren = (
  tag: JsxTag,
  props: {} | null | undefined,
  children: readonly HtmlChild[]
): HtmlChild =>
  buildElement(
    tag,
    children.length === 0
      ? { ...props }
      : { ...props, children: children.length === 1 ? children[0] : children }
  )

/** One function per HTML and SVG tag, such as `h.div(props, ...children)`. */
export type ElementTagFunctions = {
  readonly [Tag in keyof HtmlElements]: (
    props?: IntrinsicElementProps[Tag] | null,
    ...children: readonly HtmlChild[]
  ) => HtmlNode
}

/** A function component that `h()` can call. */
type ElementComponent = (props: never) => HtmlChild

// The arguments after the tag or component. One signature computes them from the first argument,
// so a wrong prop reports the prop itself rather than "No overload matches this call".
type ElementArgs<Tag> = Tag extends keyof IntrinsicElementProps
  ? [props?: IntrinsicElementProps[Tag] | null, ...children: HtmlChild[]]
  : Tag extends (props: infer Props) => HtmlChild
    ? {} extends ComponentInput<Props>
      ? [props?: ComponentInput<Props> | null, ...children: HtmlChild[]]
      : [props: ComponentInput<Props>, ...children: HtmlChild[]]
    : never

/**
 * Builds an element from a tag name, or calls a function component like `<Component />` in JSX.
 * Prefer `h.<tag>(...)` for HTML and SVG tags: TypeScript cannot infer an untyped `js`
 * expression's result inside this generic call, so typed attribute slots such as `data-text` need
 * `js<T>` here.
 *
 * @param tag An HTML or SVG tag, a hyphenated custom element name, or a function component.
 * @param args Props, typed per element or component, then children; children replace
 *   `props.children` when given.
 * @returns An HTML node for a tag, or whatever the component renders.
 */
function element<const Tag extends keyof IntrinsicElementProps | ElementComponent>(
  tag: Tag,
  ...args: ElementArgs<Tag>
): Tag extends keyof IntrinsicElementProps ? HtmlNode : HtmlChild
function element(
  tag: string | ElementComponent,
  props?: {} | null,
  ...children: readonly HtmlChild[]
): HtmlChild {
  // SAFETY: ElementArgs ties each tag or component to its own props type, and the component
  // receives exactly the props object its caller passed, plus children.
  return withChildren(tag as JsxTag, props, children)
}

// SAFETY: htmlElementTags holds exactly the keys of ElementTagFunctions, and each entry builds its
// own tag, which always yields an HtmlNode.
const tagFunctions = Object.fromEntries(
  htmlElementTags.map((tag) => [
    tag,
    (props?: {} | null, ...children: readonly HtmlChild[]) => withChildren(tag, props, children)
  ])
) as ElementTagFunctions

/**
 * Builds HTML without JSX, through the same element core as JSX: props are checked against the
 * same element types and normalized the same way, so `mod()`, signal refs, expressions, and
 * objects render exactly as they do in TSX.
 *
 * Use `h.<tag>(props, ...children)` for HTML and SVG tags, `h(Component, props, ...children)`
 * for components, and `h("my-element", props, ...children)` for custom elements or a tag chosen
 * at runtime.
 */
export type ElementFactory = typeof element & ElementTagFunctions

/**
 * Builds HTML without JSX. See {@link ElementFactory}.
 *
 * @example
 * ```ts
 * h.form({ "data-on:submit": mod(post("/signup"), { prevent: true }) },
 *   h.input({ type: "email", "data-bind": form.refs.email }),
 *   h(Field, { label: "Email" }),
 *   h("my-widget", { mode: "compact" })
 * )
 * ```
 */
export const h: ElementFactory = Object.assign(element, tagFunctions)
