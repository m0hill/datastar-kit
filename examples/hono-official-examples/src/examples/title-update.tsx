import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"
import { sleep } from "../helpers.js"

const currentTime = () => new Date().toLocaleTimeString()

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Title Update"
      slug="title_update"
      summary="Streams patches to the document title and a visible timestamp."
      source="https://data-star.dev/examples/title_update"
    >
      <div class="stack" {...ds.init(ds.get("/examples/title_update/updates"))}>
        <p>Look at the title change in the browser tab.</p>
        <output id="title-update-time" class="event-output">
          Waiting for title stream...
        </output>
      </div>
    </ExampleLayout>,
    {
      title: "Title Update - Datastar Kit",
      head: pageHead()
    }
  )
)

example.get("/updates", (c) => {
  async function* stream() {
    while (!c.req.raw.signal.aborted) {
      const time = currentTime()
      yield event.patch(<title>{time}</title>, { selector: "title" })
      yield event.patch(
        <output id="title-update-time" class="event-output">
          Current title: {time}
        </output>
      )
      await sleep(1000)
    }
  }

  return reply.stream(stream(), { heartbeat: { intervalMs: 15_000, comment: "title-update" } })
})
