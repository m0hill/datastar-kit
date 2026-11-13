// Nesting the browser's HTML parser rewrites, so the DOM no longer matches the server's markup and
// Datastar patches can morph the wrong elements. Only parser rewrites are reported; content-model
// violations the parser keeps as written, such as a <div> inside a <span>, are left alone.
// Rules follow the WHATWG tree construction algorithm, for a document with a doctype.

const headings = new Set(["h1", "h2", "h3", "h4", "h5", "h6"])

// Start tags that close an open <p> in button scope.
const closesParagraph = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "details",
  "dialog",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "header",
  "hgroup",
  "hr",
  "li",
  "main",
  "menu",
  "nav",
  "ol",
  "p",
  "pre",
  "search",
  "section",
  "summary",
  "table",
  "ul",
  ...headings
])

const defaultScope = new Set([
  "caption",
  "html",
  "object",
  "table",
  "td",
  "template",
  "th",
  "foreignObject"
])
const buttonScope = new Set([...defaultScope, "button"])
const formattingMarkers = new Set([
  "applet",
  "caption",
  "marquee",
  "object",
  "td",
  "template",
  "th"
])

// Special elements that can hold children, other than address, div, and p; an open <li>, <dd>, or <dt> behind one of these
// is not closed by a new list item.
const listItemBarriers = new Set([
  "article",
  "aside",
  "blockquote",
  "body",
  "button",
  "caption",
  "colgroup",
  "details",
  "dl",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "head",
  "header",
  "hgroup",
  "html",
  "iframe",
  "main",
  "menu",
  "nav",
  "object",
  "ol",
  "pre",
  "script",
  "search",
  "section",
  "select",
  "style",
  "summary",
  "table",
  "tbody",
  "td",
  "template",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "title",
  "tr",
  "ul",
  "foreignObject",
  ...headings
])

const tableSections = new Set(["tbody", "thead", "tfoot"])
const scriptSupporting = ["script", "template", "style"]
const tableChildren: Readonly<Record<string, ReadonlySet<string>>> = {
  table: new Set(["caption", "colgroup", "thead", "tbody", "tfoot", ...scriptSupporting]),
  tbody: new Set(["tr", ...scriptSupporting]),
  thead: new Set(["tr", ...scriptSupporting]),
  tfoot: new Set(["tr", ...scriptSupporting]),
  tr: new Set(["td", "th", ...scriptSupporting]),
  colgroup: new Set(["col", "template"])
}

const tableParts = new Set([
  "caption",
  "col",
  "colgroup",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr"
])
// A table part looks for the nearest of these: a table element to hold it, a cell or caption it
// closes, or a template, whose content may hold anything.
const tableContexts = new Set([...Object.keys(tableChildren), "caption", "td", "th", "template"])

const htmlIntegrationPoints = new Set(["foreignObject", "desc", "title"])

// HTML tags that end SVG or MathML content: the parser closes the <svg> or <math> and continues in
// HTML.
const breaksOutOfForeignContent = new Set([
  "b",
  "blockquote",
  "body",
  "br",
  "code",
  "dd",
  "div",
  "dl",
  "dt",
  "em",
  "embed",
  "head",
  "hr",
  "i",
  "img",
  "li",
  "menu",
  "meta",
  "ol",
  "p",
  "pre",
  "ruby",
  "s",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "table",
  "u",
  "ul",
  "var",
  ...headings
])

// The parser inserts these wrappers instead of moving the child out.
const impliedWrapper = (parent: string, child: string): string | undefined => {
  if (parent === "table" && child === "col") return "<colgroup>"
  if (parent === "table" && child === "tr") return "<tbody>"
  if (parent === "table" && (child === "td" || child === "th")) return "<tbody><tr>"
  if (tableSections.has(parent) && (child === "td" || child === "th")) return "<tr>"
  return undefined
}

const findOpen = (
  ancestors: readonly string[],
  targets: ReadonlySet<string>,
  barriers: ReadonlySet<string>
): string | undefined => {
  for (const ancestor of ancestors) {
    if (targets.has(ancestor)) return ancestor
    if (barriers.has(ancestor)) return undefined
  }
  return undefined
}

const listItems = new Set(["dd", "dt"])
// Tags that close, or are dropped inside, an open element of the same kind. Each entry is the open
// elements it looks for and the ancestors that hide them.
const closedBySameTag: Readonly<
  Record<string, readonly [ReadonlySet<string>, ReadonlySet<string>]>
> = {
  a: [new Set(["a"]), formattingMarkers],
  button: [new Set(["button"]), defaultScope],
  form: [new Set(["form"]), new Set(["template"])],
  li: [new Set(["li"]), listItemBarriers],
  dd: [listItems, listItemBarriers],
  dt: [listItems, listItemBarriers]
}

const rewritten = (child: string, ancestor: string, effect: string): string =>
  `<${child}> inside <${ancestor}>: ${effect}, so the browser's DOM will not match this markup`

/**
 * Explains how the HTML parser rewrites an element nested inside its open ancestors.
 *
 * @param child Tag of the element being opened.
 * @param ancestors Open element tags, nearest first, cut off at the first unknown ancestor such
 *   as a component.
 * @returns The rewrite, or `undefined` when the parser keeps the nesting as written.
 */
export const htmlNestingProblem = (
  child: string,
  ancestors: readonly string[]
): string | undefined => {
  // SVG and MathML content parses by other rules, until an SVG <foreignObject>, <desc>, or <title>
  // switches back to HTML.
  const foreignAt = ancestors.findIndex(
    (tag) => tag === "svg" || tag === "math" || htmlIntegrationPoints.has(tag)
  )
  const foreignRoot = ancestors[foreignAt]
  if (foreignRoot !== undefined && !htmlIntegrationPoints.has(foreignRoot)) {
    return breaksOutOfForeignContent.has(child)
      ? rewritten(child, foreignRoot, `the HTML parser closes the <${foreignRoot}> first`)
      : undefined
  }
  const htmlAncestors = foreignAt === -1 ? ancestors : ancestors.slice(0, foreignAt)
  const parent = htmlAncestors[0]
  if (parent === undefined) return undefined

  const wrapper = impliedWrapper(parent, child)
  if (wrapper !== undefined) {
    return rewritten(child, parent, `the HTML parser inserts ${wrapper} around it`)
  }
  const allowed = tableChildren[parent]
  // A hidden input stays in a table; the checker does not read the type, so inputs are skipped.
  if (allowed !== undefined && !allowed.has(child) && child !== "input") {
    const moved = child === "form" ? "its content" : "it"
    return rewritten(child, parent, `the HTML parser moves ${moved} out of the <${parent}>`)
  }
  if (tableParts.has(child) && allowed === undefined) {
    const context = htmlAncestors.find((tag) => tableContexts.has(tag))
    if (context === undefined) {
      return rewritten(child, parent, `the HTML parser drops the <${child}> tag`)
    }
    if (context === "td" || context === "th" || context === "caption") {
      return rewritten(child, context, `the HTML parser closes the <${context}> first`)
    }
  }
  if (headings.has(child) && headings.has(parent)) {
    return rewritten(child, parent, `the HTML parser closes the <${parent}> first`)
  }

  const openParagraph = closesParagraph.has(child)
    ? findOpen(htmlAncestors, new Set(["p"]), buttonScope)
    : undefined
  if (openParagraph !== undefined) {
    return rewritten(child, "p", "the HTML parser closes the <p> first")
  }

  const closer = closedBySameTag[child]
  const nestedSame =
    closer === undefined ? undefined : findOpen(htmlAncestors, closer[0], closer[1])
  if (nestedSame === undefined) return undefined
  return child === "form"
    ? rewritten(child, nestedSame, "the HTML parser drops the inner <form> tag")
    : rewritten(child, nestedSame, `the HTML parser closes the <${nestedSame}> first`)
}

/**
 * Whether text placed directly in this element is moved out of it by the HTML parser.
 *
 * @param parent Tag of the element that holds the text.
 */
export const movesTextOut = (parent: string): boolean => Object.hasOwn(tableChildren, parent)
