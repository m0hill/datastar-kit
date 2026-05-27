import { ds } from "datastar-kit"
import { examplePage } from "../layout.js"
import type { ExampleModule } from "../types.js"

const keys = ["KEY ELSE", "CM", "OM", "FETCH", "SET", "EXEC", "TEST ALARM", "3", "2", "1", "ENTER", "CLEAR"]

export const eventBubblingExample: ExampleModule = {
  slug: "event_bubbling",
  title: "Event Bubbling",
  summary: "Uses one delegated click listener to read button metadata from bubbled events.",
  source: "https://data-star.dev/examples/event_bubbling",
  register(app) {
    app.get("/examples/event_bubbling", () =>
      examplePage({
        title: "Event Bubbling",
        slug: "event_bubbling",
        summary: this.summary,
        source: this.source,
        children: (
          <div class="stack" {...ds.dataSignals({ key: "" })}>
            <p>
              Key pressed: <strong {...ds.text(ds.expr("$key || 'none'"))}></strong>
            </p>
            <div
              class="keypad"
              {...ds.on(
                "click",
                ds.expr("$key = evt.target.closest('button[data-id]')?.dataset.id ?? $key")
              )}
            >
              {keys.map((key) => (
                <button data-id={key} class={key.includes(" ") ? "gray" : undefined}>
                  {key}
                </button>
              ))}
            </div>
          </div>
        )
      })
    )
  }
}
