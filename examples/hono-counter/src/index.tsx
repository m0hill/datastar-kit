import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { ds, reply } from "datastar-kit"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

let count = 0

const Count = () => <output id="count" aria-live="polite">{count}</output>

const Counter = () => (
  <main id="counter" class="counter-shell">
    <h1>Hono counter</h1>
    <p>This example mounts Datastar Kit response helpers inside Hono routes.</p>
    <div class="counter-row">
      <button type="button" {...ds.on("click", ds.post("/increment"))}>Increment</button>
      <Count />
    </div>
  </main>
)

const pageStyles = `
  body {
    color: #17202a;
    font-family: system-ui, sans-serif;
    margin: 0;
  }

  .counter-shell {
    display: grid;
    gap: 1rem;
    margin: 4rem auto;
    max-width: 32rem;
    padding: 0 1rem;
  }

  .counter-row {
    align-items: center;
    display: flex;
    gap: 1rem;
  }

  button {
    border: 1px solid #17202a;
    border-radius: 0.5rem;
    background: #17202a;
    color: white;
    cursor: pointer;
    font: inherit;
    padding: 0.5rem 0.75rem;
  }

  output {
    font-size: 2rem;
    font-variant-numeric: tabular-nums;
    min-width: 3ch;
  }
`

const app = new Hono()

app.get("/", () =>
  reply.page(<Counter />, {
    title: "Hono counter",
    head: [
      <script type="module" src={DATASTAR_CDN} />,
      <style>{pageStyles}</style>
    ]
  })
)

app.post("/increment", () => {
  count += 1
  return reply.patch(<Count />)
})

app.notFound((c) => c.text("Not Found", 404))

serve(app)
