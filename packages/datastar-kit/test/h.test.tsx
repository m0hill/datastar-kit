import { describe, expect, it } from "vitest"
import {
  dataAttrs,
  Fragment,
  h,
  js,
  mod,
  post,
  renderToString,
  signal,
  state,
  type HtmlChild
} from "../src/index.js"

const form = state({ email: "", agree: false })
const count = signal<number, "count">("count")

// Both forms of a small component: one written with JSX, one with h().
const FieldJsx = (props: { readonly label: string; readonly children?: HtmlChild }) => (
  <label className="field">
    {props.label}
    {props.children}
  </label>
)
const FieldH = (props: { readonly label: string; readonly children?: HtmlChild }) =>
  h.label({ className: "field" }, props.label, props.children)

describe("h()", () => {
  // h() and JSX share one element core, so the same tree must render the same HTML.
  it("renders exactly what the equivalent JSX renders", () => {
    const viaJsx = (
      <form
        data-signals={mod(form.defaults, { ifMissing: true })}
        data-on:submit={mod(post("/signup"), { prevent: true })}
      >
        <FieldJsx label="Email">
          <input
            type="email"
            data-bind={form.refs.email}
          />
        </FieldJsx>
        <input
          type="checkbox"
          data-bind={form.refs.agree}
        />
        <>
          <output data-text={js`${count} * 2`} />
          <div data-ignore={mod({ self: true })} />
        </>
        <my-widget mode="compact" />
      </form>
    )

    const viaTagFunctions = h.form(
      {
        "data-signals": mod(form.defaults, { ifMissing: true }),
        "data-on:submit": mod(post("/signup"), { prevent: true })
      },
      h(FieldH, { label: "Email" }, h.input({ type: "email", "data-bind": form.refs.email })),
      h.input({ type: "checkbox", "data-bind": form.refs.agree }),
      h(
        Fragment,
        null,
        h.output({ "data-text": js`${count} * 2` }),
        h.div({ "data-ignore": mod({ self: true }) })
      ),
      h("my-widget", { mode: "compact" })
    )

    const viaTagNames = h(
      "form",
      {
        "data-signals": mod(form.defaults, { ifMissing: true }),
        "data-on:submit": mod(post("/signup"), { prevent: true })
      },
      h(FieldH, { label: "Email" }, h("input", { type: "email", "data-bind": form.refs.email })),
      h("input", { type: "checkbox", "data-bind": form.refs.agree }),
      h(
        Fragment,
        null,
        h("output", { "data-text": js<number>`${count} * 2` }),
        h("div", { "data-ignore": mod({ self: true }) })
      ),
      h("my-widget", { mode: "compact" })
    )

    expect(renderToString(viaTagFunctions)).toBe(renderToString(viaJsx))
    expect(renderToString(viaTagNames)).toBe(renderToString(viaJsx))
    expect(renderToString(viaJsx)).toContain('data-on:submit__prevent="@post(&quot;/signup&quot;)"')
  })
  it("lets positional children replace props.children and passes them to components", () => {
    const Card = (props: { readonly title: string; readonly children: HtmlChild }) =>
      h.section({}, h.h2({}, props.title), props.children)

    expect(renderToString(h(Card, { title: "Hi" }, "a", "b"))).toBe(
      "<section><h2>Hi</h2>ab</section>"
    )
    expect(renderToString(h.p({ children: "from props" }))).toBe("<p>from props</p>")
    expect(renderToString(h.p({ children: "from props" }, "positional"))).toBe("<p>positional</p>")
  })

  it("accepts custom data attributes through dataAttrs, as JSX does", () => {
    expect(renderToString(h.div({ id: "x", ...dataAttrs({ "data-testid": "row" }) }))).toBe(
      '<div id="x" data-testid="row"></div>'
    )
  })
})

if (false) {
  const Greeting = (props: { readonly name: string }) => h.p({}, props.name)
  const NoProps = () => h.hr()

  // Tag functions infer an untyped js expression's result from the attribute, as JSX does.
  h.output({ "data-text": js`${count} * 2` })
  h.div({ "data-show": js`${count} > 1` })
  // @ts-expect-error The generic tag-name form cannot; typed slots need js<T> there.
  h("output", { "data-text": js`${count} * 2` })

  // @ts-expect-error Misspelled Datastar attributes are excess properties, unlike in JSX.
  h.div({ "data-shwo": count })
  // @ts-expect-error Misspelled ARIA attributes are excess properties.
  h.div({ "aria-labl": "Close" })
  // @ts-expect-error The tag-name form checks props the same way.
  h("div", { "data-shwo": count })
  // @ts-expect-error Unknown non-hyphenated tags are rejected, as in JSX.
  h("dvi")
  // @ts-expect-error Effect attributes take effect expressions, not readable signals.
  h.button({ "data-on:click": count })
  // @ts-expect-error Text inputs bind strings or numbers, not booleans.
  h.input({ type: "text", "data-bind": form.refs.agree })
  // @ts-expect-error Void elements take no children.
  h.input({ children: "x" })
  // @ts-expect-error Components require their props.
  h(Greeting)
  // @ts-expect-error Component props are type-checked.
  h(Greeting, { name: 1 })
  // React-style aliases work in h() too.
  h.input({ maxLength: 40, readOnly: true, tabIndex: -1 })
  // @ts-expect-error Only on elements with the HTML attribute.
  h.div({ maxLength: 40 })
  h(NoProps)
  h(Greeting, { name: "Ada" })
}
