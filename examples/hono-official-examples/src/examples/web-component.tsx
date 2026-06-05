import { Hono } from "hono"
import { reply, state, js, local, mod, set } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"

const componentState = state({ _name: "Your Name" })
const reversed = local<string>("reversed")

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="Web Component"
      slug="web_component"
      summary="Keeps a custom element attribute synchronized from a Datastar signal."
      source="https://data-star.dev/examples/web_component"
    >
      <div class="stack" data-signals={mod(componentState.defaults, { ifMissing: true })}>
        <label>
          Reversed
          <input type="text" data-bind={componentState.$._name} />
        </label>
        <span data-signals={{ [reversed.name]: "" }} data-text={reversed}></span>
        <reverse-component
          data-on:reverse={set(reversed, js`evt.detail.value`)}
          data-attr:name={componentState.$._name}
        ></reverse-component>
      </div>
    </ExampleLayout>,
    {
      title: "Web Component - Datastar Kit",
      head: pageHead(<script type="module" src="/public/reverse-component.js" />)
    }
  )
)
