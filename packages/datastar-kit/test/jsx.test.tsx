import { describe, expect, it } from "vitest"
import { bind, dataSignals, on, post, signal, text } from "../src/ds/index.js"
import { mergeProps, renderToString, type HtmlChild } from "../src/html.js"
import type { JsxProps } from "../src/jsx.js"
import { jsx as runtimeJsx } from "../src/jsx-runtime.js"

describe("automatic JSX runtime", () => {
  it("renders JSX through the same HTML renderer", () => {
    const node = (
      <button type="button" disabled>
        Save
      </button>
    )

    expect(renderToString(node)).toBe('<button type="button" disabled>Save</button>')
  })

  it("supports Datastar attr fragments in JSX", () => {
    const count = signal<number>("count")
    const node = (
      <main {...mergeProps({ id: "counter" }, dataSignals({ count: 0 }, { ifMissing: true }))}>
        <button {...mergeProps({ type: "button" }, on("click", post("/increment")))}>+</button>
        <output {...text(count)}>0</output>
      </main>
    )

    expect(renderToString(node)).toBe(
      '<main id="counter" data-signals__ifmissing="{&quot;count&quot;: 0}"><button type="button" data-on:click="@post(&quot;/increment&quot;)">+</button><output data-text="$count">0</output></main>'
    )
  })

  it("supports spreading Datastar helper props directly in JSX", () => {
    const node = (
      <form>
        <button {...on("click", post("/increment"))}>+</button>
        <input {...bind("count")} />
      </form>
    )

    expect(renderToString(node)).toBe(
      '<form><button data-on:click="@post(&quot;/increment&quot;)">+</button><input data-bind="count"></form>'
    )
  })

  it("rejects expression objects as JSX prop values", () => {
    expect(() =>
      runtimeJsx("output", { "data-text": signal<number>("count") } as unknown as JsxProps)
    ).toThrow('Unsupported JSX prop value for "data-text"')
  })

  it("normalizes TSX className to HTML class", () => {
    const node = <div className="stack gap-2">Hello</div>

    expect(renderToString(node)).toBe('<div class="stack gap-2">Hello</div>')
  })

  it("normalizes htmlFor to the HTML for attribute", () => {
    const node = <label htmlFor="email">Email</label>

    expect(renderToString(node)).toBe('<label for="email">Email</label>')
  })

  it("renders fragments for sibling nodes", () => {
    const nodes = (
      <>
        <span>A</span>
        <span>B</span>
      </>
    )

    expect(renderToString(nodes)).toBe("<span>A</span><span>B</span>")
  })

  it("supports typed server components", () => {
    interface LinkProps {
      readonly href: string
      readonly children?: HtmlChild | readonly HtmlChild[]
    }

    const Link = (props: LinkProps) => <a href={props.href}>{props.children}</a>

    expect(renderToString(<Link href="/docs">Docs</Link>)).toBe('<a href="/docs">Docs</a>')
  })
})
