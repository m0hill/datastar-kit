import { ds, unsafeHtml } from "datastar-kit"
import { examplePage } from "../layout.js"
import type { ExampleModule } from "../types.js"

export const sortableExample: ExampleModule = {
  slug: "sortable",
  title: "Sortable",
  summary: "Combines SortableJS with a Datastar custom event to report the new order.",
  source: "https://data-star.dev/examples/sortable",
  register(app) {
    app.get("/examples/sortable", () =>
      examplePage({
        title: "Sortable",
        slug: "sortable",
        summary: this.summary,
        source: this.source,
        children: (
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
new Sortable(sortContainer, {
  animation: 150,
  ghostClass: "dragging",
  onEnd: (evt) => {
    sortContainer.dispatchEvent(
      new CustomEvent("reordered", {
        detail: {
          orderInfo: \`Moved from position \${evt.oldIndex + 1} to \${evt.newIndex + 1}\`
        }
      })
    )
  }
})`)}
            </script>
          </div>
        )
      })
    )
  }
}
