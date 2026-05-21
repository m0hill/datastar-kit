import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { ds, reply } from "datastar-kit"

let count = 0

const app = new Hono()

app.get("/", () =>
  reply.page(
    <main id="counter">
      <h1>Hono counter</h1>
      <button type="button" {...ds.on("click", ds.post("/increment"))}>Increment</button>{" "}
      <output id="count">{count}</output>
    </main>,
    {
    title: "Hono counter",
    head: [<script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js" />]
  })
)

app.post("/increment", () => {
  count += 1
  return reply.patch(<output id="count">{count}</output>)
})

app.notFound((c) => c.text("Not Found", 404))

serve(app, (info) => {
  console.log(`Hono counter listening on http://localhost:${info.port}`)
})
