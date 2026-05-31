import { Hono } from "hono"
import { ds, reply, unsafeHtml } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

const state = ds.state({ _name: "Your Name" })

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Web Component"
      slug="web_component"
      summary="Keeps a custom element attribute synchronized from a Datastar signal."
      source="https://data-star.dev/examples/web_component"
    >
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
      <div class="stack" {...state.attrs()}>
        <label>
          Reversed
          <input type="text" {...ds.bind(state.$._name)} />
        </label>
        <span {...ds.dataSignal("_reversed", "")} {...ds.text(ds.expr("$_reversed"))}></span>
        <reverse-component
          {...ds.on("reverse", ds.expr("$_reversed = evt.detail.value"))}
          {...ds.dataAttr("name", ds.expr("$_name"))}
        ></reverse-component>
      </div>
    </ExampleLayout>,
    {
      title: "Web Component - Datastar Kit",
      head: pageHead()
    }
  )
)
