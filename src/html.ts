export type AttributeValue = string | number | boolean | null | undefined
export type Attributes = Readonly<Record<string, AttributeValue>>
export type AttributeEntry = readonly [name: string, value: AttributeValue]

export interface OrderedAttributes {
  readonly _tag: "OrderedAttributes"
  readonly entries: readonly AttributeEntry[]
}

export type AttributeInput = Attributes | OrderedAttributes

export interface RawHtml {
  readonly _tag: "RawHtml"
  readonly html: string
}

export type Child = HtmlNode | RawHtml | string | number | boolean | null | undefined | readonly Child[]

export interface HtmlNode {
  readonly tag: string
  readonly attrs: AttributeInput
  readonly children: readonly Child[]
}

export interface Renderer<Node = unknown> {
  readonly render: (node: Node) => string
}

const voidTags = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
])

export const h = (tag: string, attrs: AttributeInput = {}, ...children: readonly Child[]): HtmlNode => ({
  tag,
  attrs,
  children
})

export const fragment = (...children: readonly Child[]): readonly Child[] => children

export const rawHtml = (html: string): RawHtml => ({
  _tag: "RawHtml",
  html
})

export const attrs = (...entries: readonly AttributeEntry[]): OrderedAttributes => ({
  _tag: "OrderedAttributes",
  entries
})

export const isOrderedAttributes = (value: unknown): value is OrderedAttributes =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "OrderedAttributes"

export const isRawHtml = (value: unknown): value is RawHtml =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "RawHtml"

export const mergeOrderedAttrs = (...groups: readonly AttributeInput[]): OrderedAttributes =>
  attrs(...groups.flatMap((group) => isOrderedAttributes(group) ? [...group.entries] : Object.entries(group) as AttributeEntry[]))

const escapeText = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const escapeAttribute = (value: string): string =>
  escapeText(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const attributeEntries = (attrs: AttributeInput): readonly AttributeEntry[] =>
  isOrderedAttributes(attrs) ? attrs.entries : Object.entries(attrs) as AttributeEntry[]

const renderAttrs = (attrs: AttributeInput): string => {
  const rendered: Array<string> = []

  for (const [key, value] of attributeEntries(attrs)) {
    if (value === false || value === null || value === undefined) {
      continue
    }

    if (value === true) {
      rendered.push(key)
      continue
    }

    rendered.push(`${key}="${escapeAttribute(String(value))}"`)
  }

  return rendered.length === 0 ? "" : ` ${rendered.join(" ")}`
}

export const isHtmlNode = (value: unknown): value is HtmlNode =>
  typeof value === "object" &&
  value !== null &&
  "tag" in value &&
  "attrs" in value &&
  "children" in value

export class MissingPatchIdError extends Error {
  readonly _tag = "MissingPatchIdError"

  constructor(readonly tag: string) {
    super(`Patchable <${tag}> nodes must have an id attribute`)
  }
}

const attrValue = (attrs: AttributeInput, name: string): AttributeValue => {
  for (const [key, value] of attributeEntries(attrs)) {
    if (key === name) {
      return value
    }
  }
}

export const patchableNode = (tag: string, id: string, attributes: AttributeInput = {}, ...children: readonly Child[]): HtmlNode =>
  h(tag, mergeOrderedAttrs(attrs(["id", id]), attributes), ...children)

export const requirePatchId = <Node extends HtmlNode>(node: Node): Node => {
  const id = attrValue(node.attrs, "id")
  if (typeof id !== "string" || id.length === 0) {
    throw new MissingPatchIdError(node.tag)
  }
  return node
}

export const render = (child: Child): string => {
  if (Array.isArray(child)) {
    return child.map(render).join("")
  }

  if (child === null || child === undefined || child === false) {
    return ""
  }

  if (child === true) {
    return "true"
  }

  if (isRawHtml(child)) {
    return child.html
  }

  if (!isHtmlNode(child)) {
    return escapeText(String(child))
  }

  const attrs = renderAttrs(child.attrs)

  if (voidTags.has(child.tag)) {
    return `<${child.tag}${attrs}>`
  }

  return `<${child.tag}${attrs}>${child.children.map(render).join("")}</${child.tag}>`
}

export interface HtmlDocumentOptions {
  readonly lang?: string
  readonly head?: Child | readonly Child[]
  readonly body?: Child | readonly Child[]
}

const childrenArray = (child: Child | readonly Child[] | undefined): readonly Child[] => {
  if (child === undefined) {
    return []
  }
  return Array.isArray(child) ? child : [child]
}

export const htmlRenderer: Renderer<Child> = {
  render
}

export const htmlDocument = (options: HtmlDocumentOptions = {}): string =>
  `<!doctype html>${htmlRenderer.render(
    h(
      "html",
      { lang: options.lang ?? "en" },
      h("head", {}, ...childrenArray(options.head)),
      h("body", {}, ...childrenArray(options.body))
    )
  )}`
