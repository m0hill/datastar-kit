import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
  bind,
  dataSignals,
  get,
  h,
  htmlPatchResponse,
  htmlResponse,
  mergeAttrs,
  on,
  queryUrl,
  readQuery,
  render,
  route,
  router,
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

export const resultsView = (q: string): string =>
  render(
    h(
      "tbody",
      { id: "results" },
      ...rows(q).map((contact) =>
        h("tr", {}, h("td", {}, contact.first), h("td", {}, contact.last))
      )
    )
  )

export const searchView = (): string => {
  const q = signal<string, "q">("q")

  return render(
    h(
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
  )
}

export const searchRoute = route("GET", "/search", (request) =>
  readQuery(request, SearchQuery).pipe(
    Effect.map(({ q }) => htmlPatchResponse(resultsView(q), { selector: "#results", mode: "outer" }))
  )
)

export const app = router(
  route("GET", "/", () => Effect.succeed(htmlResponse(searchView()))),
  searchRoute
)
