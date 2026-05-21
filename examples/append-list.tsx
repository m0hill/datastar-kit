import { ds, reply } from "datastar-kit"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

interface ListItem {
  readonly id: number
  readonly label: string
}

export function makeAppendList() {
  const items: Array<ListItem> = []
  let nextId = 1

  function handle(request: Request) {
    const url = new URL(request.url)

    if (request.method === "GET" && url.pathname === "/") {
      return reply.page(
        <main id="append-list">
          <h1>Append list</h1>
          <p>Each click appends a new item into the list target.</p>
          <button type="button" {...ds.on("click", ds.post("/items"))}>Add item</button>
          <ul id="items">
            {items.map((item) => <li id={`item-${item.id}`}>{item.label}</li>)}
          </ul>
        </main>,
        { head: <script type="module" src={DATASTAR_CDN} /> }
      )
    }

    if (request.method === "POST" && url.pathname === "/items") {
      const item: ListItem = { id: nextId, label: `Item ${nextId}` }
      nextId += 1
      items.push(item)

      return reply.patch(<li id={`item-${item.id}`}>{item.label}</li>, { selector: "#items", mergeMode: "append" })
    }

    return new Response("Not Found", { status: 404 })
  }

  return {
    handle,
    currentItems: () => [...items]
  }
}

const appendList = makeAppendList()

export function handle(request: Request) {
  return appendList.handle(request)
}
