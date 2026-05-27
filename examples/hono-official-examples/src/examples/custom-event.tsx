import { ds, unsafeHtml } from "datastar-kit"
import { examplePage } from "../layout.js"
import type { ExampleModule } from "../types.js"

export const customEventExample: ExampleModule = {
  slug: "custom_event",
  title: "Custom Event",
  summary: "Listens to a browser CustomEvent and copies the event detail into a local signal.",
  source: "https://data-star.dev/examples/custom_event",
  register(app) {
    app.get("/examples/custom_event", () =>
      examplePage({
        title: "Custom Event",
        slug: "custom_event",
        summary: this.summary,
        source: this.source,
        children: (
          <div class="stack">
            <p
              id="custom-event-target"
              class="event-output"
              {...ds.dataSignal("_eventDetails", "Waiting for event...")}
              {...ds.on("myevent", ds.expr("$_eventDetails = evt.detail"))}
              {...ds.text(ds.expr("`Last Event Details: ${$_eventDetails}`"))}
            ></p>
            <script>
              {unsafeHtml(`const customEventTarget = document.getElementById("custom-event-target")
setInterval(() => {
  customEventTarget.dispatchEvent(
    new CustomEvent("myevent", {
      detail: JSON.stringify({ eventTime: new Date().toLocaleTimeString() })
    })
  )
}, 1000)`)}
            </script>
          </div>
        )
      })
    )
  }
}
