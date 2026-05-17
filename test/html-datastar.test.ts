import { describe, expect, it } from "vitest"
import { bind, dataSignals, mergeAttrs, on, post, signal, signals, text } from "../src/datastar.js"
import { h, render } from "../src/html.js"

describe("typed Datastar HTML helpers", () => {
  it("renders escaped HTML and boolean attributes", () => {
    expect(render(h("button", { disabled: true, title: "A & B" }, "Save <now>"))).toBe(
      '<button disabled title="A &amp; B">Save &lt;now&gt;</button>'
    )
  })

  it("creates typed signal expressions", () => {
    const count = signal<number, "count">("count")

    expect(count.toDatastarExpression()).toBe("$count")
    expect(count.add(1).toDatastarExpression()).toBe("$count++")
    expect(count.set(3).toDatastarExpression()).toBe("($count = 3)")
  })

  it("creates typed signal records for app signal shapes", () => {
    const $ = signals<{ count: number; form: { email: string } }>()

    expect($.count.add(2).toDatastarExpression()).toBe("($count = $count + 2)")
    expect($.form.path("email").toDatastarExpression()).toBe("$form.email")
  })

  it("builds Datastar action attributes", () => {
    expect(on("click", post("/increment"))).toEqual({
      "data-on:click": '@post("/increment")'
    })
  })

  it("renders a minimal counter view", () => {
    const count = signal<number, "count">("count")
    const view = h(
      "main",
      mergeAttrs({ id: "counter" }, dataSignals({ count: 0 }, { ifMissing: true })),
      h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
      h("output", text(count), "0"),
      h("input", mergeAttrs({ type: "number" }, bind(count)))
    )

    expect(render(view)).toBe(
      '<main id="counter" data-signals__ifmissing="{&quot;count&quot;: 0}"><button type="button" data-on:click="@post(&quot;/increment&quot;)">+</button><output data-text="$count">0</output><input type="number" data-bind:count></main>'
    )
  })
})
