export type PropValue = string | number | boolean | null | undefined
export type Props = Readonly<Record<string, PropValue>>

interface RawHtml {
  readonly _tag: "RawHtml"
  readonly html: string
}

export type Child = HtmlNode | RawHtml | string | number | boolean | null | undefined | readonly Child[]

export interface HtmlNode {
  readonly tag: string
  readonly props: Props
  readonly children: readonly Child[]
}

export interface PageOptions {
  readonly lang?: string
  readonly head?: Child | readonly Child[]
  readonly body?: Child | readonly Child[]
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

export const h = (tag: string, props: Props = {}, ...children: readonly Child[]): HtmlNode => ({
  tag,
  props,
  children
})

export const fragment = (...children: readonly Child[]): readonly Child[] => children

export const raw = (html: string): Child => ({
  _tag: "RawHtml",
  html
})

export const props = (...groups: readonly Props[]): Props => Object.assign({}, ...groups)

const isRawHtml = (value: unknown): value is RawHtml =>
  typeof value === "object" && value !== null && "_tag" in value && value._tag === "RawHtml"

const isHtmlNode = (value: unknown): value is HtmlNode =>
  typeof value === "object" &&
  value !== null &&
  "tag" in value &&
  "props" in value &&
  "children" in value

const escapeText = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")

const escapeProp = (value: string): string =>
  escapeText(value)
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")

const renderProps = (props: Props): string => {
  const rendered: Array<string> = []

  for (const [key, value] of Object.entries(props)) {
    if (value === false || value === null || value === undefined) {
      continue
    }

    if (value === true) {
      rendered.push(key)
      continue
    }

    rendered.push(`${key}="${escapeProp(String(value))}"`)
  }

  return rendered.length === 0 ? "" : ` ${rendered.join(" ")}`
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

  const renderedProps = renderProps(child.props)

  if (voidTags.has(child.tag)) {
    return `<${child.tag}${renderedProps}>`
  }

  return `<${child.tag}${renderedProps}>${child.children.map(render).join("")}</${child.tag}>`
}

const childrenArray = (child: Child | readonly Child[] | undefined): readonly Child[] => {
  if (child === undefined) {
    return []
  }
  return Array.isArray(child) ? child : [child]
}

export const page = (options: PageOptions = {}): string =>
  `<!doctype html>${render(
    h(
      "html",
      { lang: options.lang ?? "en" },
      h("head", {}, ...childrenArray(options.head)),
      h("body", {}, ...childrenArray(options.body))
    )
  )}`
