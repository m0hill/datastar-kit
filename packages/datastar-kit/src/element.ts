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

// The element core shared by `h()` and JSX: both check props against the same element types,
// normalize Datastar values the same way, and call components the same way.

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

/**
 * Internal function component signature used by the JSX runtime.
 *
 * @internal
 */
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
 *
 * @param props The children to render.
 * @returns The children, unchanged.
 */
export const Fragment = (props: {
  readonly children?: HtmlChild | readonly HtmlChild[]
}): HtmlChild => props.children

/**
 * An intrinsic tag or a function component.
 *
 * @internal
 */
export type JsxTag = string | JsxComponent

/**
 * Builds an element or calls a component from props with children included. `h()`, the JSX
 * runtimes, and `createElement` all end here.
 *
 * @internal
 * @param tag Intrinsic tag or function component, `Fragment` included.
 * @param input Props, children included.
 * @returns An HTML node or whatever the component renders.
 */
export const buildElement = (tag: JsxTag, input: JsxInput | null): HtmlChild =>
  typeof tag === "function"
    ? tag(componentProps(input))
    : htmlNode(tag, elementProps(input), ...childList(input?.children))

// Children may come positionally, so a component's props need not include them.
type ComponentInput<Props> = Omit<Props, "children"> &
  Partial<Pick<Props, Extract<keyof Props, "children">>>

// Positional children, when given, replace props.children.
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

/**
 * Builds an element from a tag name. Prefer `h.<tag>(...)` for HTML and SVG tags: TypeScript
 * cannot infer an untyped `js` expression's result inside this generic call, so typed attribute
 * slots such as `data-text` need `js<T>` here.
 *
 * @param tag An HTML or SVG tag, or a hyphenated custom element name.
 * @param props Attributes, typed per element, including Datastar attributes.
 * @param children Child nodes; they replace `props.children` when given.
 * @returns An HTML node for `renderToString()` or the response helpers.
 */
function element<const Tag extends keyof IntrinsicElementProps>(
  tag: Tag,
  props?: IntrinsicElementProps[Tag] | null,
  ...children: readonly HtmlChild[]
): HtmlNode
/**
 * Calls a function component with its props and children, like `<Component />` in JSX.
 *
 * @param component The function component.
 * @param args The component's props, then its children.
 * @returns Whatever the component renders.
 */
function element<Props extends object>(
  component: (props: Props) => HtmlChild,
  ...args: {} extends ComponentInput<Props>
    ? [props?: ComponentInput<Props> | null, ...children: HtmlChild[]]
    : [props: ComponentInput<Props>, ...children: HtmlChild[]]
): HtmlChild
function element(
  tag: string | ((props: never) => HtmlChild),
  props?: {} | null,
  ...children: readonly HtmlChild[]
): HtmlChild {
  // SAFETY: the overloads tie each component to its own props type, and the component receives
  // exactly the props object its caller passed, plus children.
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
