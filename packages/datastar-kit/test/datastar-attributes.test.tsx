import { describe, expect, it } from "vitest"
import { js, local, post, preserve, regex, signal, state } from "../src/ds/index.js"
import { h, HtmlNameError, renderToString } from "../src/html.js"
import { jsx as runtimeJsx } from "../src/jsx-runtime.js"

// Renders one attribute through the JSX runtime without the compile-time attribute types, so the
// runtime policy for each canonical attribute is checked independently of the typings.
const renderAttribute = (name: string, value: unknown): string =>
  renderToString(runtimeJsx("div", { [name]: value }))

describe("Datastar attribute values", () => {
  // Datastar evaluates these values as expressions, so JSX booleans and numbers must reach the
  // browser as expression source; dropping `false` would leave e.g. data-show always visible.
  it.each([
    "data-attr:disabled",
    "data-class:active",
    "data-computed:total",
    "data-effect",
    "data-init",
    "data-on:click",
    "data-on-intersect",
    "data-on-interval",
    "data-on-signal-patch",
    "data-show",
    "data-signals:ready",
    "data-style:opacity",
    "data-text"
  ])("serializes primitive %s values as expression source", (name) => {
    expect(renderAttribute(name, true)).toBe(`<div ${name}="true"></div>`)
    expect(renderAttribute(name, false)).toBe(`<div ${name}="false"></div>`)
    expect(renderAttribute(name, 0)).toBe(`<div ${name}="0"></div>`)
  })

  // These attributes take no value in Datastar (or name a signal through their key), so `true`
  // renders the bare attribute and `false` omits it.
  it.each([
    "data-bind:query",
    "data-ignore",
    "data-ignore-morph",
    "data-indicator:fetching",
    "data-json-signals",
    "data-persist",
    "data-persist:profile",
    "data-query-string",
    "data-ref:panel",
    "data-scope-children",
    "data-scroll-into-view"
  ])("renders %s as a presence attribute", (name) => {
    expect(renderAttribute(name, true)).toBe(`<div ${name}></div>`)
    expect(renderAttribute(name, false)).toBe("<div></div>")
    expect(renderAttribute(name, null)).toBe("<div></div>")
  })

  it("renders signal refs as bare names where Datastar expects a signal name", () => {
    const query = signal<string, "query">("query")
    const fetching = local<boolean>("fetching")
    const panel = signal<HTMLElement, "panel">("panel")

    expect(
      renderToString(
        <input
          data-bind={query}
          data-indicator={fetching}
          data-ref={panel}
          data-text={query}
        />
      )
    ).toBe(
      '<input data-bind="query" data-indicator="_fetching" data-ref="panel" data-text="$query">'
    )
  })

  it("keeps string values as raw, HTML-escaped expression source", () => {
    expect(renderToString(<button data-on:click="$label = 'a & b'" />)).toBe(
      '<button data-on:click="$label = &#39;a &amp; b&#39;"></button>'
    )
  })

  it("serializes structured values as JavaScript object and array literals", () => {
    const label = signal<string>("label")
    const total = signal<number>("total")

    expect(
      renderToString(
        <div
          data-signals={{
            title: 'Say "hi" & <wave>',
            nested: { items: ["a", 1, true], removed: null, unset: undefined }
          }}
          data-attr={{ "aria-label": label }}
          data-computed={{ double: js`() => ${total} * 2` }}
        />
      )
    ).toBe(
      '<div data-signals="{&quot;title&quot;: &quot;Say \\&quot;hi\\&quot; &amp; &lt;wave&gt;&quot;, &quot;nested&quot;: {&quot;items&quot;: [&quot;a&quot;, 1, true], &quot;removed&quot;: null, &quot;unset&quot;: undefined}}" data-attr="{&quot;aria-label&quot;: $label}" data-computed="{&quot;double&quot;: () =&gt; $total * 2}"></div>'
    )
  })

  it("treats objects shaped like expressions as plain data", () => {
    expect(
      renderToString(
        <div
          data-signals={{ toDatastarExpression: "literal", nested: { toDatastarExpression: 1 } }}
        />
      )
    ).toBe(
      '<div data-signals="{&quot;toDatastarExpression&quot;: &quot;literal&quot;, &quot;nested&quot;: {&quot;toDatastarExpression&quot;: 1}}"></div>'
    )
  })

  it("serializes regular expressions in signal filters", () => {
    expect(
      renderToString(
        <pre data-json-signals={{ include: /^counter$/i, exclude: regex("_temp$") }}></pre>
      )
    ).toBe(
      '<pre data-json-signals="{&quot;include&quot;: new RegExp(&quot;^counter$&quot;, &quot;i&quot;), &quot;exclude&quot;: new RegExp(&quot;_temp$&quot;, &quot;&quot;)}"></pre>'
    )
  })

  it("serializes state defaults and expressions for data-signals", () => {
    const form = state({ name: "", errors: { name: "" } })

    expect(
      renderToString(
        <form
          data-signals={form.defaults}
          data-on:submit={post("/save")}
        />
      )
    ).toBe(
      '<form data-signals="{&quot;name&quot;: &quot;&quot;, &quot;errors&quot;: {&quot;name&quot;: &quot;&quot;}}" data-on:submit="@post(&quot;/save&quot;)"></form>'
    )
  })

  it("serializes structured values on custom data attributes for app plugins", () => {
    expect(renderAttribute("data-tooltip", { text: "Hi", at: signal("anchor") })).toBe(
      '<div data-tooltip="{&quot;text&quot;: &quot;Hi&quot;, &quot;at&quot;: $anchor}"></div>'
    )
  })

  it("rejects expressions and objects on non-data attributes", () => {
    expect(() => runtimeJsx("output", { id: signal<number>("count") })).toThrow(
      'Unsupported JSX prop value for "id"'
    )
    expect(() => runtimeJsx("div", { title: { text: "Hi" } })).toThrow(
      'Unsupported JSX prop value for "title"'
    )
  })

  it("renders hand-written modifier suffixes from h() unchanged", () => {
    expect(renderToString(h("button", { "data-on:click__window__debounce.500ms": "$n++" }))).toBe(
      '<button data-on:click__window__debounce.500ms="$n++"></button>'
    )
  })
})

describe("preserve", () => {
  it("joins attribute names for data-preserve-attr", () => {
    expect(
      renderToString(
        <details
          open
          data-preserve-attr={preserve("open", "class")}
        />
      )
    ).toBe('<details open data-preserve-attr="open class"></details>')
  })

  it("rejects names that would corrupt the attribute list", () => {
    expect(() => preserve("open", "bad name")).toThrow(HtmlNameError)
    expect(() => preserve("data-ok", "bad=attr")).toThrow(HtmlNameError)
  })
})
