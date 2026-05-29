import { Hono } from "hono"
import { ds, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="On Signal Patch"
      slug="on_signal_patch"
      summary="Records signal patches with Datastar's signal-patch event hooks."
      source="https://data-star.dev/examples/on_signal_patch"
    >
      <div
        class="stack"
        {...ds.dataSignals({
          counter: 0,
          message: "Hello World",
          allChanges: [],
          counterChanges: []
        })}
      >
        <div class="actions">
          <button
            {...ds.on("click", ds.expr("$message = `Updated: ${performance.now().toFixed(2)}`"))}
          >
            Update Message
          </button>
          <button {...ds.on("click", ds.expr("$counter++"))}>Increment Counter</button>
          <button
            class="error"
            {...ds.on("click", ds.expr("$allChanges.length = 0; $counterChanges.length = 0"))}
          >
            Clear All Changes
          </button>
        </div>
        <div class="grid">
          <section class="subdemo">
            <h2>Current Values</h2>
            <p>
              Counter: <span {...ds.text(ds.expr("$counter"))}></span>
            </p>
            <p>
              Message: <span {...ds.text(ds.expr("$message"))}></span>
            </p>
          </section>
          <section
            class="subdemo"
            {...ds.onSignalPatch(ds.expr("$counterChanges.push(patch)"))}
            {...ds.onSignalPatchFilter({ include: ds.regex("^counter$") })}
          >
            <h2>Counter Changes Only</h2>
            <pre
              class="signal-log"
              {...ds.jsonSignals({ include: ds.regex("^counterChanges") }, { terse: true })}
            ></pre>
          </section>
          <section
            class="subdemo"
            {...ds.onSignalPatch(ds.expr("$allChanges.push(patch)"))}
            {...ds.onSignalPatchFilter({ exclude: ds.regex("allChanges|counterChanges") })}
          >
            <h2>All Signal Changes</h2>
            <pre
              class="signal-log"
              {...ds.jsonSignals({ include: ds.regex("^allChanges") }, { terse: true })}
            ></pre>
          </section>
        </div>
      </div>
    </ExampleLayout>,
    {
      title: "On Signal Patch - Datastar Kit",
      head: pageHead()
    }
  )
)
