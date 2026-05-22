import { Hono } from "hono"
import { ds, reply } from "datastar-kit"

const app = new Hono()

const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

let count = 0

const Count = () => <output id="count">{count}</output>

app.get("/", () =>
  reply.page(
    <main id="counter">
      <h1>Worker Hono counter</h1>
      <button type="button" {...ds.on("click", ds.post("/increment"))}>
        Increment
      </button>{" "}
      <Count />
    </main>,
    {
      title: "Worker Hono counter",
      head: <script type="module" src={DATASTAR_RUNTIME} />
    }
  )
)

app.post("/increment", () => {
  count += 1
  return reply.patch(<Count />)
})

app.notFound((c) => c.text("Not Found", 404))

export default app
