import { Hono } from "hono"
import { ds, h, props, reply, type Child } from "../src/index.js"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const datastarScript = (): Child => h("script", { type: "module", src: DATASTAR_CDN })
const countNode = (count: number): Child => h("output", { id: "count" }, count)

const counterNode = (count = 0): Child =>
  h(
    "main",
    { id: "counter" },
    h("h1", {}, "ts-star counter"),
    h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
    countNode(count)
  )

export const makeHonoCounter = () => {
  const app = new Hono()
  let count = 0

  app.get("/", () =>
    reply.page({
      head: datastarScript(),
      body: counterNode(count)
    })
  )

  app.post("/increment", () => {
    count += 1
    return reply.patch(countNode(count), { selector: "#count" })
  })

  return {
    app,
    handle: (request: Request): Response | Promise<Response> => app.fetch(request),
    currentCount: () => count
  }
}

const defaultCounter = makeHonoCounter()

export const app = defaultCounter.app
export const handle = (request: Request): Response | Promise<Response> => defaultCounter.handle(request)
export const currentCount = (): number => defaultCounter.currentCount()
