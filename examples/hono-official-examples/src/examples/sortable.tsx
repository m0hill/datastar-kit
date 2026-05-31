import { Hono } from "hono"
import { ds, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Sortable"
      slug="sortable"
      summary="Combines SortableJS with a Datastar custom event to report the new order."
      source="https://data-star.dev/examples/sortable"
    >
      <div class="stack">
        <output
          class="event-output"
          {...ds.dataSignal("orderInfo", "Initial order")}
          {...ds.text(ds.expr("$orderInfo"))}
        ></output>
        <div
          id="sortContainer"
          class="sortable-list"
          {...ds.on("reordered", ds.expr("$orderInfo = evt.detail.orderInfo"))}
        >
          {Array.from({ length: 5 }, (_, index) => (
            <button type="button">Item {index + 1}</button>
          ))}
        </div>
      </div>
    </ExampleLayout>,
    {
      title: "Sortable - Datastar Kit",
      head: pageHead(<script type="module" src="/public/sortable.js" />)
    }
  )
)
