import { describe, expect, it } from "vitest"
import { get, js, mod, signal } from "../src/ds/index.js"
import { h, renderToString } from "../src/html.js"

describe("data-init", () => {
  it("renders init expressions with the hyperscript factory", () => {
    const node = h("div", { "data-init": "$count = 1" })

    expect(renderToString(node)).toBe('<div data-init="$count = 1"></div>')
  })

  it("renders JSX values from actions, signal refs, and expression helpers", () => {
    const count = signal<number>("count")

    const node = (
      <div>
        <div data-init={js`${count} = ${1}`}></div>
        <div data-init={get("/endpoint")}></div>
      </div>
    )

    expect(renderToString(node)).toBe(
      '<div><div data-init="$count = 1"></div><div data-init="@get(&quot;/endpoint&quot;)"></div></div>'
    )
  })

  it("keeps string JSX values as raw Datastar expressions", () => {
    const node = <div data-init="$count = $count + 1"></div>

    expect(renderToString(node)).toBe('<div data-init="$count = $count + 1"></div>')
  })

  it("preserves the el expression variable", () => {
    const node = (
      <div
        id="bar"
        data-init="$label = el.id"
      ></div>
    )

    expect(renderToString(node)).toBe('<div id="bar" data-init="$label = el.id"></div>')
  })

  it("keeps the runtime defensive for untyped primitive values", () => {
    const nodes = [
      // @ts-expect-error data-init requires an expression, not true
      <div data-init={true} />,
      // @ts-expect-error data-init requires an expression, not false
      <div data-init={false} />,
      // @ts-expect-error data-init requires an expression, not 0
      <div data-init={0} />
    ]

    expect(renderToString(nodes)).toBe(
      '<div data-init="true"></div><div data-init="false"></div><div data-init="0"></div>'
    )
  })

  it("renders delay modifiers from number, numeric string, duration string, and boolean forms", () => {
    const expr = js<void>("$count = 1")

    const node = (
      <div>
        <div data-init={mod(expr, { delay: 500 })}></div>
        <div data-init={mod(expr, { delay: "500" })}></div>
        <div data-init={mod(expr, { delay: "1s" })}></div>
        <div data-init={mod(expr, { delay: true })}></div>
      </div>
    )

    expect(renderToString(node)).toBe(
      '<div><div data-init__delay.500ms="$count = 1"></div><div data-init__delay.500ms="$count = 1"></div><div data-init__delay.1s="$count = 1"></div><div data-init__delay="$count = 1"></div></div>'
    )
  })

  it("renders view transition modifier and combines it with delay in authored order", () => {
    const node = (
      <div data-init={mod(js<void>("$count = 1"), { delay: "500ms", viewTransition: true })}></div>
    )

    expect(renderToString(node)).toBe(
      '<div data-init__delay.500ms__viewtransition="$count = 1"></div>'
    )
  })

  it("renders normal hand-written modifier syntax through JSX", () => {
    const node = <div {...{ "data-init__delay.500ms__viewtransition": "$count = 1" }}></div>

    expect(renderToString(node)).toBe(
      '<div data-init__delay.500ms__viewtransition="$count = 1"></div>'
    )
  })

  it("preserves authored order when indicator is needed before data-init", () => {
    const node = (
      <div
        data-indicator:fetching
        data-init={get("/endpoint")}
      ></div>
    )

    expect(renderToString(node)).toBe(
      '<div data-indicator:fetching data-init="@get(&quot;/endpoint&quot;)"></div>'
    )
  })

  it("rejects explicit modifiers that data-init does not support", () => {
    expect(() => (
      // @ts-expect-error data-init does not accept the debounce modifier
      <div data-init={mod(js("$count = 1"), { debounce: "500ms" })} />
    )).toThrow('Datastar modifier "debounce" is not valid on "data-init"')
  })
})
