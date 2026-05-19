/** @jsx jsx */
import { ds, reply } from "../src/index.js"
import { jsx } from "../src/jsx.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

export function makeTsxCounter() {
  let count = 0

  function handle(request: Request) {
    const url = new URL(request.url)

    if (request.method === "GET" && url.pathname === "/") {
      return reply.page({
        head: <script type="module" src={DATASTAR_CDN}></script>,
        body: (
          <main id="tsx-counter" className="counter-shell">
            <h1>ts-star TSX counter</h1>
            <button type="button" {...ds.on("click", ds.post("/increment"))}>+</button>
            <output id="count">{count}</output>
          </main>
        )
      })
    }

    if (request.method === "POST" && url.pathname === "/increment") {
      count += 1
      return reply.patch(<output id="count">{count}</output>, { selector: "#count" })
    }

    return new Response("Not Found", { status: 404 })
  }

  return {
    handle,
    currentCount: () => count
  }
}

const counter = makeTsxCounter()

export function handle(request: Request) {
  return counter.handle(request)
}
