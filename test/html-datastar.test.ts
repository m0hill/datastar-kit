import { describe, expect, it } from "vitest"
import * as ds from "../src/ds.js"
import { h, props, render } from "../src/html.js"

describe("typed Datastar HTML helpers", () => {
  it("renders escaped HTML and boolean attributes", () => {
    expect(render(h("button", { disabled: true, title: "A & B" }, "Save <now>"))).toBe(
      '<button disabled title="A &amp; B">Save &lt;now&gt;</button>'
    )
  })

  it("creates typed signal expressions", () => {
    const count = ds.signal<number, "count">("count")

    expect(count.toDatastarExpression()).toBe("$count")
    expect(ds.expr("$count++").toDatastarExpression()).toBe("$count++")
    expect(ds.expr("($count = 3)").toDatastarExpression()).toBe("($count = 3)")
  })

  it("creates typed nested signal paths", () => {
    const form = ds.signal<{ email: string }, "form">("form")

    expect(ds.expr("($count = $count + 2)").toDatastarExpression()).toBe("($count = $count + 2)")
    expect(form.path("email").toDatastarExpression()).toBe("$form.email")
  })

  it("builds Datastar action attributes", () => {
    expect(ds.on("click", ds.post("/increment"))).toEqual({
      "data-on:click": '@post("/increment")'
    })
  })

  it("renders a minimal counter view", () => {
    const count = ds.signal<number, "count">("count")
    const view = h(
      "main",
      props({ id: "counter" }, ds.dataSignals({ count: 0 }, { ifMissing: true })),
      h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
      h("output", ds.text(count), "0"),
      h("input", props({ type: "number" }, ds.bind(count)))
    )

    expect(render(view)).toBe(
      '<main id="counter" data-signals__ifmissing="{&quot;count&quot;: 0}"><button type="button" data-on:click="@post(&quot;/increment&quot;)">+</button><output data-text="$count">0</output><input type="number" data-bind:count></main>'
    )
  })
})
