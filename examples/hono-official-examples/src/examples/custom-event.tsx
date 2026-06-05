import { Hono } from "hono"
import { ds, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

const state = ds.state({ _eventDetails: "Waiting for event..." })

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
          data-signals={[state.defaults, { ifMissing: true }]}
          data-on:myevent={ds.set(state.$._eventDetails, ds.expr`evt.detail`)}
          data-text={ds.expr`${"Last Event Details: "} + ${state.$._eventDetails}`}
        ></p>
      </div>
    </ExampleLayout>,
    {
      title: "Custom Event - Datastar Kit",
      head: pageHead(<script type="module" src="/public/custom-event.js" />)
    }
  )
)
