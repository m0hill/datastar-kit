import { describe, expect, it } from "vitest"
import { htmlNestingProblem, movesTextOut } from "./html-nesting.js"

// The browser is the oracle: a nesting is rewritten exactly when parsing the markup gives back
// different markup. Each parent sits in the context it needs to parse as written itself.
const contexts: Readonly<Record<string, readonly string[]>> = {
  li: ["ul"],
  dd: ["dl"],
  dt: ["dl"],
  caption: ["table"],
  colgroup: ["table"],
  tbody: ["table"],
  thead: ["table"],
  tfoot: ["table"],
  tr: ["table", "tbody"],
  td: ["table", "tbody", "tr"],
  th: ["table", "tbody", "tr"]
}

const parents = [
  "a",
  "button",
  "div",
  "dl",
  "form",
  "h1",
  "li",
  "dd",
  "dt",
  "p",
  "section",
  "span",
  "svg",
  "template",
  "ul",
  "caption",
  "colgroup",
  "table",
  "tbody",
  "td",
  "tr"
]

const children = [
  "a",
  "button",
  "col",
  "dd",
  "div",
  "dt",
  "form",
  "h2",
  "hr",
  "li",
  "p",
  "section",
  "span",
  "table",
  "tbody",
  "td",
  "tr",
  "ul",
  "#text"
]

// Nestings with elements in between, which the parser looks through or stops at.
const deeper = [
  ["p", "span", "ul"],
  ["p", "button", "div"],
  ["a", "span", "a"],
  ["a", "svg", "a"],
  ["svg", "desc", "span"],
  ["svg", "title", "p"],
  ["svg", "g", "div"],
  ["form", "div", "form"],
  ["li", "div", "li"],
  ["li", "ul", "li"],
  ["dt", "span", "dd"],
  ["table", "tbody", "tr", "td", "table", "tbody", "tr"]
]

const voidTags = new Set(["col", "hr"])

const markup = (chain: readonly string[], leaf: string): string => {
  // The parser keeps an empty <form> where it is and moves only its content, so it needs some.
  const content = leaf === "form" ? "text" : ""
  const inner =
    leaf === "#text"
      ? "text"
      : // Void tags are void only in HTML; inside SVG the browser serializes a closing tag.
        voidTags.has(leaf) && !chain.includes("svg")
        ? `<${leaf}>`
        : `<${leaf}>${content}</${leaf}>`
  return chain.reduceRight((html, tag) => `<${tag}>${html}</${tag}>`, inner)
}

const reparsed = (html: string): string =>
  new DOMParser().parseFromString(`<!doctype html><body>${html}`, "text/html").body.innerHTML

const disagreement = (chain: readonly string[], leaf: string): string | undefined => {
  const html = markup(chain, leaf)
  const rewritten = reparsed(html) !== html
  const parent = chain.at(-1)
  const reported =
    leaf === "#text"
      ? parent !== undefined && movesTextOut(parent)
      : htmlNestingProblem(leaf, chain.toReversed()) !== undefined
  if (rewritten === reported) return undefined
  return `${html}: the browser ${rewritten ? "rewrites" : "keeps"} it, the checker ${reported ? "reports" : "does not report"} it`
}

describe("HTML nesting rules", () => {
  it("report exactly the nesting the browser's parser rewrites", () => {
    const cases = [
      ...parents.flatMap((parent) =>
        children.map((child) => ({ chain: [...(contexts[parent] ?? []), parent], leaf: child }))
      ),
      ...deeper.map((chain) => ({ chain: chain.slice(0, -1), leaf: chain.at(-1) ?? "" }))
    ]

    expect(cases.flatMap(({ chain, leaf }) => disagreement(chain, leaf) ?? [])).toEqual([])
  })
})
