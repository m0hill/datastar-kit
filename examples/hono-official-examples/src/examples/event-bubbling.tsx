import { Hono } from "hono"
import { ds, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

const state = ds.state({ key: "" })

const keys = [
  "KEY ELSE",
  "CM",
  "OM",
  "FETCH",
  "SET",
  "EXEC",
  "TEST ALARM",
  "3",
  "2",
  "1",
  "ENTER",
  "CLEAR"
]

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Event Bubbling"
      slug="event_bubbling"
      summary="Uses one delegated click listener to read button metadata from bubbled events."
      source="https://data-star.dev/examples/event_bubbling"
    >
      <div id="demo" {...state.attrs()}>
        <p>
          Key pressed: <span {...ds.text(state.$.key)}></span>
        </p>
        <div
          id="event-bubbling-container"
          class="keypad"
          {...ds.on(
            "click",
            ds.expr("$key = evt.target.closest('button[data-id]')?.dataset.id ?? $key")
          )}
        >
          {keys.map((key) => (
            <button data-id={key} class={key.includes(" ") ? "gray" : undefined}>
              {key.includes(" ") ? key.split(" ").map((part) => [part, <br />]) : key}
            </button>
          ))}
        </div>
      </div>
    </ExampleLayout>,
    {
      title: "Event Bubbling - Datastar Kit",
      head: pageHead()
    }
  )
)
