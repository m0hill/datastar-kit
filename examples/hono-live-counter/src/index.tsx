import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"
import { invalidations } from "./realtime/hub.js"

const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

let count = 0

const app = new Hono()

const Count = () => <output id="count" aria-live="polite">{count}</output>

const Counter = () => (
  <main id="counter" {...ds.init(ds.get("/live"))}>
    <h1>Hono live counter</h1>
    <p>Open this page in two tabs. Clicking increment in either tab updates both.</p>
    <button type="button" {...ds.on("click", ds.post("/increment"))}>
      Increment
    </button>{" "}
    <Count />
  </main>
)

app.get("/", () =>
  reply.page(<Counter />, {
    title: "Hono live counter",
    head: [<script type="module" src={DATASTAR_RUNTIME} />]
  })
)

app.get("/live", (c) => {
  async function* stream() {
    yield event.patch(<Count />)

    for await (const _ of invalidations.subscribe(c.req.raw.signal)) {
      yield event.patch(<Count />)
    }
  }

  return reply.stream(stream(), {
    heartbeat: { intervalMs: 15_000, comment: "live-counter" }
  })
})

app.post("/increment", () => {
  count += 1
  invalidations.publish()
  return reply.patch(<Count />)
})

app.notFound((c) => c.text("Not Found", 404))

serve({ fetch: app.fetch, port: 3000 }, () => {
  console.log("Hono live counter listening on http://localhost:3000")
})
