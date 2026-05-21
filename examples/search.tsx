import { ds, reply } from "datastar-kit"

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

    return reply.page(
      <main id="search" {...ds.dataSignals({ q: "" }, { ifMissing: true })}>
        <input
          type="search"
          placeholder="Search contacts"
          {...ds.bind(q)}
          {...ds.on("input", ds.get(ds.queryUrl("/search", { q })), { debounce: 200 })}
        />
        <table><tbody id="results" /></table>
      </main>,
      { head: <script type="module" src={DATASTAR_CDN} /> }
    )
  }

  if (request.method === "GET" && url.pathname === "/search") {
    const query = url.searchParams.get("q") ?? ""
    const needle = query.toLowerCase()
    const matches = contacts.filter((contact) =>
      `${contact.first} ${contact.last}`.toLowerCase().includes(needle)
    )

    return reply.patch(
      <tbody id="results">
        {matches.length === 0
          ? <tr><td colspan={2}>No contacts found</td></tr>
          : matches.map((contact) => (
            <tr>
              <td>{contact.first}</td>
              <td>{contact.last}</td>
            </tr>
          ))}
      </tbody>,
      { selector: "#results" }
    )
  }

  return new Response("Not Found", { status: 404 })
}
