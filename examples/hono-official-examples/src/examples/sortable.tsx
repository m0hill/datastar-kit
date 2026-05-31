import { Hono } from "hono"
import { ds, unsafeHtml, reply } from "datastar-kit"
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
        <script type="module">
          {unsafeHtml(`import Sortable from "https://cdn.jsdelivr.net/npm/sortablejs/+esm"

const sortContainer = document.getElementById("sortContainer")
if (sortContainer !== null) {
  new Sortable(sortContainer, {
    animation: 150,
    ghostClass: "dragging",
    onEnd: (evt) => {
      if (evt.oldIndex === undefined || evt.newIndex === undefined) return

      sortContainer.dispatchEvent(
        new CustomEvent("reordered", {
          detail: {
            orderInfo: \`Moved from position \${evt.oldIndex + 1} to \${evt.newIndex + 1}\`
          }
        })
      )
    }
  })
}`)}
        </script>
      </div>
    </ExampleLayout>,
    {
      title: "Sortable - Datastar Kit",
      head: pageHead()
    }
  )
)
