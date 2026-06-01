import { Hono } from "hono"
import { ds, event, reply, read } from "datastar-kit"
import { z } from "zod"
import { ExampleLayout, pageHead } from "../layout.js"

const pageSize = 10

const schema = z.object({
  offset: z.number().default(0),
  limit: z.number().default(pageSize)
})

const state = ds.state({ offset: 0, limit: pageSize })
const fetching = ds.local<boolean>("fetching")

const agents = Array.from({ length: 50 }, (_, index) => ({
  name: `Agent Smith ${index}`,
  email: `void${index + 1}@null.org`,
  id: (0x1982e3a7bb241055n + BigInt(index) * 0x12345n).toString(16)
}))

const AgentRows = ({ offset, limit }: { offset: number; limit: number }) => (
  <>
    {agents.slice(offset, offset + limit).map((agent) => (
      <tr>
        <td>{agent.name}</td>
        <td>{agent.email}</td>
        <td>{agent.id}</td>
      </tr>
    ))}
  </>
)

const EnoughClicking = () => (
  <div id="demo" class="stack">
    <p>That’s enough clicking for you.</p>
    <iframe
      class="wide"
      width="560"
      height="315"
      src="https://www.youtube.com/embed/dQw4w9WgXcQ?si=Flaiw-OADzippqDg?rel=0&autoplay=1"
      title="YouTube video player"
      allow="autoplay"
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  </div>
)

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Click To Load"
      slug="click_to_load"
      summary="Requests the next slice of table rows and patches the body in place."
      source="https://data-star.dev/examples/click_to_load"
    >
      <div id="demo" data-signals__ifmissing={state.defaults}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>ID</th>
            </tr>
          </thead>
          <tbody id="agents">
            <AgentRows offset={0} limit={pageSize} />
          </tbody>
        </table>
        <button
          class="info wide"
          data-indicator={fetching}
          data-attr:aria-disabled={ds.expr`\`${fetching}\``}
          data-on:click={ds.expr`if (!${fetching}) { ${ds.get("/examples/click_to_load/more")} }`}
        >
          Load More
        </button>
      </div>
    </ExampleLayout>,
    {
      title: "Click To Load - Datastar Kit",
      head: pageHead()
    }
  )
)

example.get("/more", async (c) => {
  const { offset, limit } = schema.parse(await read.signals(c.req.raw))
  const nextOffset = offset + limit

  if (offset >= agents.length) {
    return reply.patch(<EnoughClicking />)
  }

  return reply.stream([
    event.signals(state.patch({ offset: nextOffset, limit })),
    event.patch(<AgentRows offset={nextOffset} limit={limit} />, {
      selector: "#agents",
      mode: "append"
    })
  ])
})
