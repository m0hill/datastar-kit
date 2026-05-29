import { Hono } from "hono"
import { ds, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Custom Plugin"
      slug="custom_plugin"
      summary="Registers a client-side action plugin and attribute plugin, then uses both from markup."
      source="https://data-star.dev/examples/custom_plugin"
    >
      <div class="stack">
        <div role="group">
          <button
            class="info"
            type="button"
            {...ds.on("click", ds.action("alert", "Hello from an action"))}
          >
            Alert using an action
          </button>
          <button class="warning" type="button" data-alert="'Hello from an attribute'">
            Alert using an attribute
          </button>
        </div>
        <output id="custom-plugin-output" class="event-output">
          No plugin has run yet.
        </output>
      </div>
    </ExampleLayout>,
    {
      title: "Custom Plugin - Datastar Kit",
      head: pageHead(<script type="module" src="/public/custom-plugin.js" />)
    }
  )
)
