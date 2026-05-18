import { Hono } from "hono"
import { countNode, counterNode, DATASTAR_CDN } from "./counter.js"
import { h, reply } from "../src/index.js"

export const makeHonoCounter = () => {
  const app = new Hono()
  let count = 0

  app.get("/", (context) =>
    reply.page({
      head: h("script", { type: "module", src: DATASTAR_CDN }),
      body: counterNode(count)
    })
  )

  app.post("/increment", (context) => {
    count += 1
    return reply.patch(countNode(count), { selector: "#count", mode: "outer" })
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
