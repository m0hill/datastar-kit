import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"
import { readSignals } from "../helpers.js"

const agents = Array.from({ length: 40 }, (_, index) => ({
  name: `Agent Smith ${index}`,
  email: `agent.${index}@matrix.example`,
  id: (0x65cd25028f98f158n + BigInt(index) * 0x6789n).toString(16)
}))

const pageSize = 8

const InfiniteRows = ({ count }: { readonly count: number }) => (
  <tbody id="infinite-scroll-body">
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
          <div
            class="loading-row"
            {...ds.onIntersect(ds.get("/examples/infinite_scroll/more"), { once: true })}
          >
            Loading...
          </div>
        </td>
      </tr>
    ) : (
      <tr>
        <td colSpan={3} class="muted">
          End of agents.
        </td>
      </tr>
    )}
  </tbody>
)

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Infinite Scroll"
      slug="infinite_scroll"
      summary="Loads the next page automatically when the sentinel intersects the viewport."
      source="https://data-star.dev/examples/infinite_scroll"
    >
      <div class="stack" {...ds.dataSignals({ offset: pageSize }, { ifMissing: true })}>
        <h2>Agents</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>ID</th>
            </tr>
          </thead>
          <InfiniteRows count={pageSize} />
        </table>
      </div>
    </ExampleLayout>,
    {
      title: "Infinite Scroll - Datastar Kit",
      head: pageHead()
    }
  )
)

example.get("/more", async (c) => {
  const { offset = pageSize } = await readSignals<{ offset?: number }>(c.req.raw)
  const nextOffset = Math.min(offset + pageSize, agents.length)
  return reply.stream([
    event.signals({ offset: nextOffset }),
    event.patch(<InfiniteRows count={nextOffset} />)
  ])
})
