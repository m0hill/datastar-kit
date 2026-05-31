import { Hono } from "hono"
import { ds, reply, unsafeHtml } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Custom Event"
      slug="custom_event"
      summary="Listens to a browser CustomEvent and copies the event detail into a local signal."
      source="https://data-star.dev/examples/custom_event"
    >
      <div class="stack">
        <p
          id="custom-event-target"
          class="event-output"
          {...ds.dataSignal("_eventDetails", "Waiting for event...")}
          {...ds.on("myevent", ds.expr("$_eventDetails = evt.detail"))}
          {...ds.text(ds.expr("`Last Event Details: ${$_eventDetails}`"))}
        ></p>
      </div>
    </ExampleLayout>,
    {
      title: "Custom Event - Datastar Kit",
      head: pageHead(
        <script>
          {unsafeHtml(`const target = document.getElementById("custom-event-target")

setInterval(() => {
  target?.dispatchEvent(
    new CustomEvent("myevent", {
      detail: JSON.stringify({
        eventTime: new Date().toLocaleTimeString()
      })
    })
  )
}, 1000)`)}
        </script>
      )
    }
  )
)
