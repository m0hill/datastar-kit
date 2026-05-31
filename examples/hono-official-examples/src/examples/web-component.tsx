import { Hono } from "hono"
import { ds, reply } from "datastar-kit"
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
      head: pageHead(<script type="module" src="/public/reverse-component.js" />)
    }
  )
)
