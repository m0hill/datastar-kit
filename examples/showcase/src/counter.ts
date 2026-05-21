import { ds, h, mergeProps, reply } from "datastar-kit"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

export function makeCounter() {
  let count = 0

  function handle(request: Request) {
    const url = new URL(request.url)

    if (request.method === "GET" && url.pathname === "/") {
      return reply.page(
        h(
          "main",
          { id: "counter" },
          h("h1", {}, "Datastar Kit counter"),
          h("button", mergeProps({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
          h("output", { id: "count" }, count)
        ),
        { head: h("script", { type: "module", src: DATASTAR_CDN }) }
      )
    }

    if (request.method === "POST" && url.pathname === "/increment") {
      count += 1
      return reply.patch(h("output", { id: "count" }, count))
    }

    return new Response("Not Found", { status: 404 })
  }

  return {
    handle,
    currentCount: () => count
  }
}

const counter = makeCounter()

export function handle(request: Request) {
  return counter.handle(request)
}
