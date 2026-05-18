import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import {
  bind,
  datastarDocument,
  datastarHtmlPatchResponse,
  dataSignals,
  get,
  h,
  platformHtmlResponse,
  platformReadQuery,
  platformRouter,
  mergeAttrs,
  on,
  queryUrl,
  render,
  signal
} from "../src/index.js"

interface Contact {
  readonly first: string
  readonly last: string
}

const contacts: ReadonlyArray<Contact> = [
  { first: "Ada", last: "Lovelace" },
  { first: "Grace", last: "Hopper" },
  { first: "Edsger", last: "Dijkstra" }
]

export const SearchQuery = Schema.Struct({
  q: Schema.String
})

const rows = (q: string) => {
  const needle = q.toLowerCase()
  return contacts.filter((contact) => `${contact.first} ${contact.last}`.toLowerCase().includes(needle))
}

export const resultsView = (q: string): string => {
  const matches = rows(q)

  return render(
    h(
      "tbody",
      { id: "results" },
      ...(matches.length === 0
        ? [h("tr", {}, h("td", { colspan: 2 }, "No contacts found"))]
        : matches.map((contact) =>
          h("tr", {}, h("td", {}, contact.first), h("td", {}, contact.last))
        ))
    )
  )
}

export const searchNode = () => {
  const q = signal<string, "q">("q")

  return h(
    "main",
    mergeAttrs({ id: "search" }, dataSignals({ q: "" }, { ifMissing: true })),
    h(
      "input",
      mergeAttrs(
        { type: "search", placeholder: "Search contacts" },
        bind(q),
        on("input", get(queryUrl("/search", { q })), { debounce: 200 })
      )
    ),
    h("table", {}, h("tbody", { id: "results" }))
  )
}

export const searchView = (): string => render(searchNode())

export const searchPage = (): HttpServerResponse.HttpServerResponse =>
  platformHtmlResponse(datastarDocument(searchNode()))

export const searchRoute = HttpRouter.route(
  "GET",
  "/search",
  platformReadQuery(SearchQuery).pipe(
    Effect.map(({ q }) => datastarHtmlPatchResponse(resultsView(q), { selector: "#results", mode: "outer" }))
  )
)

export const app = platformRouter(
  HttpRouter.route("GET", "/", searchPage()),
  searchRoute
)
