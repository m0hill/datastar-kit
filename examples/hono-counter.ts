import { Hono } from "hono"
import { ds, h, props, reply } from "../src/index.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

export function makeHonoCounter() {
  const app = new Hono()
  let count = 0

  app.get("/", () =>
    reply.page({
      head: h("script", { type: "module", src: DATASTAR_CDN }),
      body: h(
        "main",
        { id: "counter" },
        h("h1", {}, "ts-star counter"),
        h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
        h("output", { id: "count" }, count)
      )
    })
  )

  app.post("/increment", () => {
    count += 1
    return reply.patch(h("output", { id: "count" }, count), { selector: "#count" })
  })

  return {
    app,
    handle: (request: Request) => app.fetch(request),
    currentCount: () => count
  }
}

const counter = makeHonoCounter()

export const app = counter.app

export function handle(request: Request) {
  return counter.handle(request)
}
