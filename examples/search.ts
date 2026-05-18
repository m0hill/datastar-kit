import {
  ds,
  h,
  props,
  render,
  reply
} from "../src/index.js"
import { DATASTAR_CDN } from "./counter.js"

interface Contact {
  readonly first: string
  readonly last: string
}

const contacts: ReadonlyArray<Contact> = [
  { first: "Ada", last: "Lovelace" },
  { first: "Grace", last: "Hopper" },
  { first: "Edsger", last: "Dijkstra" }
]

const notFound = (): Response => new Response("Not Found", { status: 404 })

const rows = (q: string) => {
  const needle = q.toLowerCase()
  return contacts.filter((contact) => `${contact.first} ${contact.last}`.toLowerCase().includes(needle))
}

export const resultsNode = (q: string) => {
  const matches = rows(q)

  return h(
    "tbody",
    { id: "results" },
    ...(matches.length === 0
      ? [h("tr", {}, h("td", { colspan: 2 }, "No contacts found"))]
      : matches.map((contact) =>
        h("tr", {}, h("td", {}, contact.first), h("td", {}, contact.last))
      ))
  )
}

export const resultsView = (q: string): string => render(resultsNode(q))

export const searchNode = () => {
  const q = ds.signal<string, "q">("q")

  return h(
    "main",
    props({ id: "search" }, ds.dataSignals({ q: "" }, { ifMissing: true })),
    h(
      "input",
      props(
        { type: "search", placeholder: "Search contacts" },
        ds.bind(q),
        ds.on("input", ds.get(ds.queryUrl("/search", { q })), { debounce: 200 })
      )
    ),
    h("table", {}, h("tbody", { id: "results" }))
  )
}

export const searchView = (): string => render(searchNode())

export const searchPage = (): Response =>
  reply.page({
    head: h("script", { type: "module", src: DATASTAR_CDN }),
    body: searchNode()
  })

export const searchResults = (request: Request): Response => {
  const url = new URL(request.url)
  return reply.patch(resultsNode(url.searchParams.get("q") ?? ""), { selector: "#results", mode: "outer" })
}

export const handle = (request: Request): Response => {
  const url = new URL(request.url)
  if (request.method === "GET" && url.pathname === "/") {
    return searchPage()
  }
  if (request.method === "GET" && url.pathname === "/search") {
    return searchResults(request)
  }
  return notFound()
}
