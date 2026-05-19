import { ds, h, props, reply } from "../src/index.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const contacts = [
  { first: "Ada", last: "Lovelace" },
  { first: "Grace", last: "Hopper" },
  { first: "Edsger", last: "Dijkstra" }
]

export function handle(request: Request) {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") {
    const q = ds.signal<string>("q")

    return reply.page({
      head: h("script", { type: "module", src: DATASTAR_CDN }),
      body: h(
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
    })
  }

  if (request.method === "GET" && url.pathname === "/search") {
    const query = url.searchParams.get("q") ?? ""
    const needle = query.toLowerCase()
    const matches = contacts.filter((contact) =>
      `${contact.first} ${contact.last}`.toLowerCase().includes(needle)
    )

    return reply.patch(
      h(
        "tbody",
        { id: "results" },
        ...(matches.length === 0
          ? [h("tr", {}, h("td", { colspan: 2 }, "No contacts found"))]
          : matches.map((contact) => h("tr", {}, h("td", {}, contact.first), h("td", {}, contact.last))))
      ),
      { selector: "#results" }
    )
  }

  return new Response("Not Found", { status: 404 })
}
