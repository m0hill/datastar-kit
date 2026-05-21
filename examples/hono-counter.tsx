import { Hono } from "hono"
import { ds, reply } from "datastar-kit"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

export function makeHonoCounter() {
  const app = new Hono()
  let count = 0

  app.get("/", () =>
    reply.page(
      <main id="counter">
        <h1>Datastar Kit counter</h1>
        <button type="button" {...ds.on("click", ds.post("/increment"))}>+</button>
        <output id="count">{count}</output>
      </main>,
      { head: <script type="module" src={DATASTAR_CDN} /> }
    )
  )

  app.post("/increment", () => {
    count += 1
    return reply.patch(<output id="count">{count}</output>)
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
