import { describe, expect, it } from "vitest"
import { mod } from "../src/ds/index.js"
import { h, renderToString } from "../src/html.js"

describe("data-ignore-morph", () => {
  it("renders presence form with the hyperscript factory", () => {
    const node = h("div", { "data-ignore-morph": true }, "This element will not be morphed.")

    expect(renderToString(node)).toBe(
      "<div data-ignore-morph>This element will not be morphed.</div>"
    )
  })

  it("renders JSX presence form", () => {
    const node = <div data-ignore-morph>This element will not be morphed.</div>

    expect(renderToString(node)).toBe(
      "<div data-ignore-morph>This element will not be morphed.</div>"
    )
  })

  it("omits data-ignore-morph when the JSX value is false, null, or undefined", () => {
    const node = (
      <div>
        <section data-ignore-morph={false}></section>
        <section data-ignore-morph={null}></section>
        <section data-ignore-morph={undefined}></section>
      </div>
    )

    expect(renderToString(node)).toBe(
      "<div><section></section><section></section><section></section></div>"
    )
  })

  it("keeps ordinary string values raw when authored by hand", () => {
    const node = <div data-ignore-morph=""></div>

    expect(renderToString(node)).toBe('<div data-ignore-morph=""></div>')
  })

  it("preserves authored attribute order for Datastar evaluation ordering", () => {
    const node = (
      <div
        id="panel"
        data-ignore-morph
        data-text="$label"
      ></div>
    )

    expect(renderToString(node)).toBe('<div id="panel" data-ignore-morph data-text="$label"></div>')
  })

  it("rejects explicit modifier wrappers because data-ignore-morph has no supported modifiers", () => {
    expect(() => (
      // @ts-expect-error data-ignore-morph does not accept the self modifier
      <div data-ignore-morph={mod({ self: true })} />
    )).toThrow('Datastar attribute "data-ignore-morph" does not accept modifiers')
  })
})
