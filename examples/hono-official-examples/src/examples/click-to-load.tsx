import { ds, event, reply } from "datastar-kit"
import { examplePage } from "../layout.js"
import { readSignals } from "../helpers.js"
import type { ExampleModule } from "../types.js"

const agents = Array.from({ length: 32 }, (_, index) => ({
  name: `Agent Smith ${index}`,
  email: `agent.smith.${index}@matrix.example`,
  id: (0x1982e3a7bb241055n + BigInt(index) * 0x12345n).toString(16)
}))

const pageSize = 6

const AgentRows = ({ count }: { readonly count: number }) => (
  <tbody id="click-to-load-body">
    {agents.slice(0, count).map((agent) => (
      <tr>
        <td>{agent.name}</td>
        <td>{agent.email}</td>
        <td>
          <code>{agent.id}</code>
        </td>
      </tr>
    ))}
    {count < agents.length ? (
      <tr>
        <td colSpan={3}>
          <button
            class="info wide"
            {...ds.indicator("_fetching")}
            {...ds.dataAttr("aria-disabled", ds.expr("`${$_fetching}`"))}
            {...ds.on(
              "click",
              ds.expr("!$_fetching && @get('/examples/click_to_load/more')")
            )}
          >
            Load More
          </button>
        </td>
      </tr>
    ) : (
      <tr>
        <td colSpan={3} class="muted">
          All agents loaded.
        </td>
      </tr>
    )}
  </tbody>
)

export const clickToLoadExample: ExampleModule = {
  slug: "click_to_load",
  title: "Click To Load",
  summary: "Requests the next slice of table rows and patches the body in place.",
  source: "https://data-star.dev/examples/click_to_load",
  register(app) {
    app.get("/examples/click_to_load", () =>
      examplePage({
        title: "Click To Load",
        slug: "click_to_load",
        summary: this.summary,
        source: this.source,
        children: (
          <div class="stack" {...ds.dataSignals({ offset: pageSize }, { ifMissing: true })}>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>ID</th>
                </tr>
              </thead>
              <AgentRows count={pageSize} />
            </table>
          </div>
        )
      })
    )

    app.get("/examples/click_to_load/more", async (c) => {
      const { offset = pageSize } = await readSignals<{ offset?: number }>(c.req.raw)
      const nextOffset = Math.min(offset + pageSize, agents.length)
      return reply.stream([
        event.signals({ offset: nextOffset }),
        event.patch(<AgentRows count={nextOffset} />)
      ])
    })
  }
}
