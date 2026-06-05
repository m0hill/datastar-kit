import { Hono } from "hono"
import { reply, state as createState, js, mod, regex, set } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

const state = createState({
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
      <div class="stack" data-signals={mod(state.defaults, { ifMissing: true })}>
        <div class="actions">
          <button
            data-on:click={set(state.$.message, js`${"Updated: "} + performance.now().toFixed(2)`)}
          >
            Update Message
          </button>
          <button data-on:click={set(state.$.counter, js`${state.$.counter} + 1`)}>
            Increment Counter
          </button>
          <button
            class="error"
            data-on:click={js`${set(state.$.allChanges, [])}; ${set(state.$.counterChanges, [])}`}
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
            data-on-signal-patch={js`${state.$.counterChanges}.push(patch)`}
            data-on-signal-patch-filter={{ include: regex("^counter$") }}
          >
            <h2>Counter Changes Only</h2>
            <pre
              class="signal-log"
              data-text={js`JSON.stringify({ counterChanges: ${state.$.counterChanges} })`}
            ></pre>
          </section>
          <section
            class="subdemo"
            data-on-signal-patch={js`${state.$.allChanges}.push(patch)`}
            data-on-signal-patch-filter={{
              exclude: regex("(^|\\.)_|allChanges|counterChanges")
            }}
          >
            <h2>All Signal Changes</h2>
            <pre
              class="signal-log"
              data-text={js`JSON.stringify({ allChanges: ${state.$.allChanges} })`}
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
