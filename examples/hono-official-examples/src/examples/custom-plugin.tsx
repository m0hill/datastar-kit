import { ds } from "datastar-kit"
import { examplePage } from "../layout.js"
import type { ExampleModule } from "../types.js"

export const customPluginExample: ExampleModule = {
  slug: "custom_plugin",
  title: "Custom Plugin",
  summary: "Registers a client-side action plugin and attribute plugin, then uses both from markup.",
  source: "https://data-star.dev/examples/custom_plugin",
  register(app) {
    app.get("/examples/custom_plugin", () =>
      examplePage({
        title: "Custom Plugin",
        slug: "custom_plugin",
        summary: this.summary,
        source: this.source,
        head: <script type="module" src="/public/custom-plugin.js" />,
        children: (
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
        )
      })
    )
  }
}
