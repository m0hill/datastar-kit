/** @jsx jsx */
/** @jsxFrag Fragment */
import { describe, expect, it } from "vitest"
import { dataSignals, mergeAttrs, on, post, signal, text } from "../src/datastar.js"
import { render, type Child } from "../src/html.js"
import { Fragment, jsx } from "../src/jsx.js"

describe("JSX templating experiment", () => {
  it("renders JSX through the same HTML renderer", () => {
    const node = <button type="button" disabled>Save</button>

    expect(render(node)).toBe('<button type="button" disabled>Save</button>')
  })

  it("supports Datastar attr fragments in JSX", () => {
    const count = signal<number, "count">("count")
    const node = (
      <main {...mergeAttrs({ id: "counter" }, dataSignals({ count: 0 }, { ifMissing: true }))}>
        <button {...mergeAttrs({ type: "button" }, on("click", post("/increment")))}>+</button>
        <output {...text(count)}>0</output>
      </main>
    )

    expect(render(node)).toBe(
      '<main id="counter" data-signals__ifmissing="{&quot;count&quot;: 0}"><button type="button" data-on:click="@post(&quot;/increment&quot;)">+</button><output data-text="$count">0</output></main>'
    )
  })

  it("renders fragments for sibling nodes", () => {
    const nodes = (
      <>
        <span>A</span>
        <span>B</span>
      </>
    )

    expect(render(nodes)).toBe("<span>A</span><span>B</span>")
  })

  it("supports typed server components", () => {
    interface LinkProps {
      readonly href: string
      readonly children?: Child | readonly Child[]
    }

    const Link = (props: LinkProps) => <a href={props.href}>{props.children}</a>

    expect(render(<Link href="/docs">Docs</Link>)).toBe('<a href="/docs">Docs</a>')
  })
})
