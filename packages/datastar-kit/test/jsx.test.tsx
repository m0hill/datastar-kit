import { describe, expect, it } from "vitest"
import { renderToString, type HtmlChild } from "../src/html.js"
import { jsxDEV as runtimeJsxDev } from "../src/jsx-dev-runtime.js"
import { jsx as runtimeJsx } from "../src/jsx-runtime.js"

describe("automatic JSX runtime", () => {
  it("normalizes React-style prop names to HTML attributes", () => {
    expect(
      renderToString(
        <label
          className="field"
          htmlFor="email"
        >
          Email
        </label>
      )
    ).toBe('<label class="field" for="email">Email</label>')
  })

  it("lets an explicit class prop win over className in either order", () => {
    expect(
      renderToString(
        <div>
          <div
            class="from-class"
            className="from-className"
          />
          <div
            className="from-className"
            class="from-class"
          />
        </div>
      )
    ).toBe('<div><div class="from-class"></div><div class="from-class"></div></div>')
  })

  it("does not render compiler-managed JSX runtime props", () => {
    const node = runtimeJsx("button", {
      key: "save",
      __self: {},
      __source: { fileName: "fixture.tsx" },
      children: "Save"
    })

    expect(renderToString(node)).toBe("<button>Save</button>")
  })

  it("renders through the development JSX runtime entrypoint", () => {
    const node = runtimeJsxDev(
      "span",
      { className: "badge", children: "Dev" },
      undefined,
      false,
      { fileName: "fixture.tsx" },
      {}
    )

    expect(renderToString(node)).toBe('<span class="badge">Dev</span>')
  })

  it("renders fragments for sibling nodes", () => {
    expect(
      renderToString(
        <>
          <span>A</span>
          <span>B</span>
        </>
      )
    ).toBe("<span>A</span><span>B</span>")
  })

  it("supports components returning any renderable child", () => {
    const Maybe = (props: { readonly show: boolean }) => (props.show ? <span>Shown</span> : null)
    const TextOnly = () => "Plain text"
    const NumberOnly = () => 7
    const Empty = () => false

    const node = (
      <>
        <Maybe show />
        <Maybe show={false} />
        <TextOnly />
        <NumberOnly />
        <Empty />
      </>
    )

    expect(renderToString(node)).toBe("<span>Shown</span>Plain text7")
  })

  // TypeScript and esbuild compile a key written after a spread to `createElement` imported from
  // the jsxImportSource root, not to `jsx`.
  it("renders an element whose key follows a spread", () => {
    const props = { id: "save", className: "primary" }
    const items = ["a", "b"]

    expect(
      renderToString(
        <ul>
          {items.map((item) => (
            <li
              {...props}
              key={item}
            >
              {item}
            </li>
          ))}
        </ul>
      )
    ).toBe('<ul><li id="save" class="primary">a</li><li id="save" class="primary">b</li></ul>')
  })

  it("passes single and multiple children to components", () => {
    interface LinkProps {
      readonly href: string
      readonly children?: HtmlChild | readonly HtmlChild[]
    }

    const Link = (props: LinkProps) => <a href={props.href}>{props.children}</a>

    expect(
      renderToString(
        <>
          <Link href="/docs">Docs</Link>
          <Link href="/api">
            <b>API</b> reference
          </Link>
        </>
      )
    ).toBe('<a href="/docs">Docs</a><a href="/api"><b>API</b> reference</a>')
  })
})
