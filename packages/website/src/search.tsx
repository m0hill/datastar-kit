import type { JSX } from "datastar-kit/jsx-runtime"
import type { DocPage, DocSection } from "./doc-types"
import { docPages } from "./generated/docs"

export interface SearchHit {
  readonly page: DocPage
  readonly section: DocSection | undefined
  readonly score: number
  readonly snippet: string
}

const SNIPPET_RADIUS = 70
const MAX_HITS = 8

const makeSnippet = (text: string, term: string): string => {
  const index = text.toLowerCase().indexOf(term)
  if (index === -1) {
    return text.slice(0, SNIPPET_RADIUS * 2)
  }
  const start = Math.max(0, index - SNIPPET_RADIUS)
  const end = Math.min(text.length, index + term.length + SNIPPET_RADIUS)
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`
}

export const searchDocs = (query: string): SearchHit[] => {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0)
  if (terms.length === 0) {
    return []
  }

  const hits: SearchHit[] = []
  for (const page of docPages) {
    const titleMatches = terms.filter((term) => page.title.toLowerCase().includes(term)).length
    if (titleMatches === terms.length) {
      hits.push({
        page,
        section: undefined,
        score: 100 + titleMatches,
        snippet: page.description.slice(0, SNIPPET_RADIUS * 2)
      })
    }
    for (const section of page.sections) {
      const haystackHeading = section.heading.toLowerCase()
      const haystackText = section.text.toLowerCase()
      let score = 0
      let matchedAll = true
      for (const term of terms) {
        if (haystackHeading.includes(term)) {
          score += 10
        } else if (haystackText.includes(term)) {
          score += 2
        } else {
          matchedAll = false
          break
        }
      }
      if (!matchedAll || score === 0) {
        continue
      }
      hits.push({
        page,
        section,
        score,
        snippet: makeSnippet(section.text, terms[0] ?? "")
      })
    }
  }

  return hits.toSorted((a, b) => b.score - a.score).slice(0, MAX_HITS)
}

export const SearchResults = (props: {
  query: string
  hits: readonly SearchHit[]
}): JSX.Element => (
  <div id="search-results">
    {props.hits.length === 0 ? (
      <p class="px-4 py-6 text-center text-sm text-fg-muted">
        No results for "{props.query.trim()}"
      </p>
    ) : (
      <ul class="divide-y divide-border-subtle">
        {props.hits.map((hit) => (
          <li>
            <a
              href={
                hit.section === undefined || hit.section.slug === ""
                  ? hit.page.path
                  : `${hit.page.path}#${hit.section.slug}`
              }
              class="block px-4 py-3 transition-colors hover:bg-surface-raised"
            >
              <span class="block text-sm font-medium text-fg">
                {hit.section === undefined || hit.section.heading === ""
                  ? hit.page.title
                  : hit.section.heading}
              </span>
              {hit.section === undefined || hit.section.heading === "" ? null : (
                <span class="block text-xs text-fg-muted">{hit.page.title}</span>
              )}
              {hit.snippet === "" ? null : (
                <span class="mt-1 block truncate text-xs text-fg-secondary">{hit.snippet}</span>
              )}
            </a>
          </li>
        ))}
      </ul>
    )}
  </div>
)
