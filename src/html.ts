export type AttributeValue = string | number | boolean | null | undefined
export type Attributes = Readonly<Record<string, AttributeValue>>
export type Child = HtmlNode | string | number | boolean | null | undefined | readonly Child[]

export interface HtmlNode {
  readonly tag: string
  readonly attrs: Attributes
  readonly children: readonly Child[]
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

export const h = (tag: string, attrs: Attributes = {}, ...children: readonly Child[]): HtmlNode => ({
  tag,
  attrs,
  children
})

export const fragment = (...children: readonly Child[]): readonly Child[] => children

const escapeText = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const escapeAttribute = (value: string): string =>
  escapeText(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const renderAttrs = (attrs: Attributes): string => {
  const rendered: Array<string> = []

  for (const [key, value] of Object.entries(attrs)) {
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

export const htmlDocument = (options: HtmlDocumentOptions = {}): string =>
  `<!doctype html>${render(
    h(
      "html",
      { lang: options.lang ?? "en" },
      h("head", {}, ...childrenArray(options.head)),
      h("body", {}, ...childrenArray(options.body))
    )
  )}`
