import { ds, reply } from "datastar-kit"
import { examplePage } from "../layout.js"
import { sleep } from "../helpers.js"
import type { ExampleModule } from "../types.js"

const Graph = () => (
  <div id="lazy-load-graph" class="lazy-graph">
    <img src="https://data-star.dev/images/examples/tokyo.png" alt="Tokyo skyline" />
  </div>
)

export const lazyLoadExample: ExampleModule = {
  slug: "lazy_load",
  title: "Lazy Load",
  summary: "Loads expensive content after the shell is already interactive.",
  source: "https://data-star.dev/examples/lazy_load",
  register(app) {
    app.get("/examples/lazy_load", () =>
      examplePage({
        title: "Lazy Load",
        slug: "lazy_load",
        summary: this.summary,
        source: this.source,
        children: (
          <div
            id="lazy-load-graph"
            class="loading-row"
            {...ds.init(ds.get("/examples/lazy_load/graph"))}
          >
            Loading...
          </div>
        )
      })
    )

    app.get("/examples/lazy_load/graph", async () => {
      await sleep(700)
      return reply.patch(<Graph />)
    })
  }
}
