import { describe, expect, it } from "vitest"
import { mod } from "../src/ds/index.js"
import { h, renderToString } from "../src/html.js"

describe("data-scope-children", () => {
  it("renders the presence form with the hyperscript factory", () => {
    const node = h("section", { "data-scope-children": true }, h("p", {}, "Scoped"))

    expect(renderToString(node)).toBe("<section data-scope-children><p>Scoped</p></section>")
  })

  it("renders the JSX presence form", () => {
    const node = (
      <section data-scope-children>
        <p>Scoped</p>
      </section>
    )

    expect(renderToString(node)).toBe("<section data-scope-children><p>Scoped</p></section>")
  })

  it("omits data-scope-children when the JSX value is false, null, or undefined", () => {
    const node = (
      <div>
        <section data-scope-children={false}></section>
        <section data-scope-children={null}></section>
        <section data-scope-children={undefined}></section>
      </div>
    )

    expect(renderToString(node)).toBe(
      "<div><section></section><section></section><section></section></div>"
    )
  })

  it("keeps hand-written values as ordinary attribute values", () => {
    const node = <section data-scope-children=""></section>

    expect(renderToString(node)).toBe('<section data-scope-children=""></section>')
  })

  it("rejects explicit modifier wrappers because data-scope-children has no supported modifiers", () => {
    expect(() => (
      // @ts-expect-error data-scope-children does not accept the self modifier
      <section data-scope-children={mod({ self: true })} />
    )).toThrow('Datastar attribute "data-scope-children" does not accept modifiers')
  })
})
