import { Hono } from "hono"
import { ds, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"
import { sleep } from "../helpers.js"

const Graph = () => (
  <div id="lazy-load-graph" class="lazy-graph">
    <img src="https://data-star.dev/images/examples/tokyo.png" alt="Tokyo skyline" />
  </div>
)

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Lazy Load"
      slug="lazy_load"
      summary="Loads expensive content after the shell is already interactive."
      source="https://data-star.dev/examples/lazy_load"
    >
      <div
        id="lazy-load-graph"
        class="loading-row"
        {...ds.init(ds.get("/examples/lazy_load/graph"))}
      >
        Loading...
      </div>
    </ExampleLayout>,
    {
      title: "Lazy Load - Datastar Kit",
      head: pageHead()
    }
  )
)

example.get("/graph", async () => {
  await sleep(700)
  return reply.patch(<Graph />)
})
