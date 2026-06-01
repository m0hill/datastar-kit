import { describe, expect, it } from "vitest"
import { post, signal, state } from "../src/ds/index.js"
import { renderToString, type HtmlChild } from "../src/html.js"
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

  it("renders Datastar signal refs and actions directly on data attributes", () => {
    const login = state({
      password: "",
      _validation: { password: "" }
    })

    const node = (
      <form
        data-signals__ifmissing={{ password: "", _validation: { password: "" } }}
        data-on:submit__prevent={post("/login")}
      >
        <input type="password" data-bind={login.$.password} />
        <small
          data-show={login.$._validation.password}
          data-text={login.$._validation.password}
        ></small>
      </form>
    )

    expect(renderToString(node)).toBe(
      '<form data-signals__ifmissing="{&quot;password&quot;: &quot;&quot;, &quot;_validation&quot;: {&quot;password&quot;: &quot;&quot;}}" data-on:submit__prevent="@post(&quot;/login&quot;)"><input type="password" data-bind="password"><small data-show="$_validation.password" data-text="$_validation.password"></small></form>'
    )
  })

  it("renders signal-name Datastar attributes without the expression prefix", () => {
    const fetching = signal<boolean, "_fetching">("_fetching")
    const panel = signal<HTMLElement, "panel">("panel")

    const node = (
      <button data-indicator={fetching} data-ref={panel}>
        Save
      </button>
    )

    expect(renderToString(node)).toBe(
      '<button data-indicator="_fetching" data-ref="panel">Save</button>'
    )
  })

  it("serializes primitive values for expression-valued Datastar attributes", () => {
    const node = (
      <div
        data-signals:_saving__ifmissing={false}
        data-attr:disabled={false}
        data-show={false}
        data-ignore
      />
    )

    expect(renderToString(node)).toBe(
      '<div data-signals:_saving__ifmissing="false" data-attr:disabled="false" data-show="false" data-ignore></div>'
    )
  })

  it("keeps string Datastar attribute values raw", () => {
    const node = (
      <button data-on:click="@post('/save')" data-text="$message">
        Save
      </button>
    )

    expect(renderToString(node)).toBe(
      '<button data-on:click="@post(&#39;/save&#39;)" data-text="$message">Save</button>'
    )
  })

  it("still rejects expression objects on ordinary JSX props", () => {
    expect(() =>
      runtimeJsx("output", { id: signal<number>("count") } as unknown as JsxProps)
    ).toThrow('Unsupported JSX prop value for "id"')
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
