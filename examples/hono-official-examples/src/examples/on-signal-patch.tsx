import { Hono } from "hono"
import { ds, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

const state = ds.state({
  counter: 0,
  message: "Hello World",
  allChanges: [],
  counterChanges: []
})

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="On Signal Patch"
      slug="on_signal_patch"
      summary="Records signal patches with Datastar's signal-patch event hooks."
      source="https://data-star.dev/examples/on_signal_patch"
    >
      <div class="stack" data-signals={[state.defaults, { ifMissing: true }]}>
        <div class="actions">
          <button
            data-on:click={ds.set(
              state.$.message,
              ds.expr`${"Updated: "} + performance.now().toFixed(2)`
            )}
          >
            Update Message
          </button>
          <button data-on:click={ds.set(state.$.counter, ds.expr`${state.$.counter} + 1`)}>
            Increment Counter
          </button>
          <button
            class="error"
            data-on:click={ds.expr`${ds.set(state.$.allChanges, [])}; ${ds.set(state.$.counterChanges, [])}`}
          >
            Clear All Changes
          </button>
        </div>
        <div class="grid">
          <section class="subdemo">
            <h2>Current Values</h2>
            <p>
              Counter: <span data-text={state.$.counter}></span>
            </p>
            <p>
              Message: <span data-text={state.$.message}></span>
            </p>
          </section>
          <section
            class="subdemo"
            data-on-signal-patch={ds.expr`${state.$.counterChanges}.push(patch)`}
            data-on-signal-patch-filter={{ include: ds.regex("^counter$") }}
          >
            <h2>Counter Changes Only</h2>
            <pre
              class="signal-log"
              data-text={ds.expr`JSON.stringify({ counterChanges: ${state.$.counterChanges} })`}
            ></pre>
          </section>
          <section
            class="subdemo"
            data-on-signal-patch={ds.expr`${state.$.allChanges}.push(patch)`}
            data-on-signal-patch-filter={{
              exclude: ds.regex("(^|\\.)_|allChanges|counterChanges")
            }}
          >
            <h2>All Signal Changes</h2>
            <pre
              class="signal-log"
              data-text={ds.expr`JSON.stringify({ allChanges: ${state.$.allChanges} })`}
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
