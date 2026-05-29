import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"
import { readSignals, sleep } from "../helpers.js"

let globalClicks = 0

const GlobalButton = () => (
  <button
    id="templ-global"
    class="info"
    {...ds.on("click", ds.patch("/examples/templ_counter/global"))}
  >
    Global Clicks: {globalClicks}
  </button>
)

const UserButton = ({ count }: { readonly count: number }) => (
  <button
    id="templ-user"
    class="success"
    {...ds.on("click", ds.patch("/examples/templ_counter/user"))}
  >
    User Clicks: {count}
  </button>
)

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Templ Counter"
      slug="templ_counter"
      summary="Ports the templ counter pattern to Datastar Kit components."
      source="https://data-star.dev/examples/templ_counter"
    >
      <div
        class="actions"
        {...ds.dataSignals({ userClicks: 0 }, { ifMissing: true })}
        {...ds.init(ds.get("/examples/templ_counter/updates"))}
      >
        <GlobalButton />
        <UserButton count={0} />
      </div>
    </ExampleLayout>,
    {
      title: "Templ Counter - Datastar Kit",
      head: pageHead()
    }
  )
)

example.patch("/global", () => {
  globalClicks += 1
  return reply.patch(<GlobalButton />)
})

example.patch("/user", async (c) => {
  const { userClicks = 0 } = await readSignals<{ userClicks?: number }>(c.req.raw)
  const next = userClicks + 1
  return reply.stream([
    event.signals({ userClicks: next }),
    event.patch(<UserButton count={next} />)
  ])
})

example.get("/updates", (c) => {
  async function* stream() {
    while (!c.req.raw.signal.aborted) {
      yield event.patch(<GlobalButton />)
      await sleep(1000)
    }
  }

  return reply.stream(stream(), { heartbeat: { intervalMs: 15_000, comment: "templ-counter" } })
})
