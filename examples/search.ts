import { ds, h, props, render, reply, type Child } from "../src/index.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const datastarScript = (): Child => h("script", { type: "module", src: DATASTAR_CDN })
const notFound = (): Response => new Response("Not Found", { status: 404 })

interface Contact {
  readonly first: string
  readonly last: string
}

const contacts: readonly Contact[] = [
  { first: "Ada", last: "Lovelace" },
  { first: "Grace", last: "Hopper" },
  { first: "Edsger", last: "Dijkstra" }
]

const q = ds.signal<string, "q">("q")
const searchUrl = ds.queryUrl("/search", { q })

const matchingContacts = (query: string): readonly Contact[] => {
  const needle = query.toLowerCase()
  return contacts.filter((contact) => `${contact.first} ${contact.last}`.toLowerCase().includes(needle))
}

const resultRow = (contact: Contact): Child =>
  h("tr", {}, h("td", {}, contact.first), h("td", {}, contact.last))

const emptyRow = (): Child =>
  h("tr", {}, h("td", { colspan: 2 }, "No contacts found"))

export const resultsNode = (query: string): Child => {
  const matches = matchingContacts(query)
  const rows = matches.length === 0 ? [emptyRow()] : matches.map(resultRow)

  return h("tbody", { id: "results" }, ...rows)
}

export const resultsView = (query: string): string => render(resultsNode(query))

export const searchNode = (): Child =>
  h(
    "main",
    props({ id: "search" }, ds.dataSignals({ q: "" }, { ifMissing: true })),
    h(
      "input",
      props(
        { type: "search", placeholder: "Search contacts" },
        ds.bind(q),
        ds.on("input", ds.get(searchUrl), { debounce: 200 })
      )
    ),
    h("table", {}, h("tbody", { id: "results" }))
  )

export const searchView = (): string => render(searchNode())

export const searchPage = (): Response =>
  reply.page({
    head: datastarScript(),
    body: searchNode()
  })

export const searchResults = (request: Request): Response => {
  const url = new URL(request.url)
  const query = url.searchParams.get("q") ?? ""

  return reply.patch(resultsNode(query), { selector: "#results" })
}

export const handle = (request: Request): Response => {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") return searchPage()
  if (request.method === "GET" && url.pathname === "/search") return searchResults(request)

  return notFound()
}
