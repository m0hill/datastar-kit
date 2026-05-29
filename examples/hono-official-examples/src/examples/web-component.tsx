import { Hono } from "hono"
import { ds, unsafeHtml, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Web Component"
      slug="web_component"
      summary="Keeps a custom element attribute synchronized from a Datastar signal."
      source="https://data-star.dev/examples/web_component"
    >
      <div class="stack" {...ds.dataSignals({ _name: "Your Name", _reversed: "" })}>
        <label>
          Reversed
          <input type="text" {...ds.bind("_name")} />
        </label>
        <span class="event-output" {...ds.text(ds.expr("$_reversed"))}></span>
        <reverse-component
          {...ds.on("reverse", ds.expr("$_reversed = evt.detail.value"))}
          {...ds.dataAttr("name", ds.expr("$_name"))}
        ></reverse-component>
        <script>
          {unsafeHtml(`class ReverseComponent extends HTMLElement {
        static get observedAttributes() {
      return ["name"]
        }

        attributeChangedCallback(_name, _oldValue, newValue) {
      const value = [...newValue].reverse().join("")
      this.dispatchEvent(new CustomEvent("reverse", { detail: { value } }))
        }
      }

      customElements.define("reverse-component", ReverseComponent)`)}
        </script>
      </div>
    </ExampleLayout>,
    {
      title: "Web Component - Datastar Kit",
      head: pageHead()
    }
  )
)
