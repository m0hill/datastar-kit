import { describe, expect, it } from "vitest"
import { dataAttrs } from "../src/data-attributes.js"
import {
  get,
  js,
  mod,
  signal,
  type DatastarAttributes,
  type DatastarSignalReference,
  type Expr,
  type SignalTarget
} from "../src/ds/index.js"
import { renderToString } from "../src/html.js"

declare module "datastar-kit/jsx-runtime" {
  interface CustomJsxAttributes {
    "data-focus-when"?: Expr<boolean>
    "hx-get"?: string
    "x-data"?: string
  }

  interface CustomJsxElements {
    "typed-widget": {
      mode: "compact" | "full"
      count?: number
    }
  }
}

const typecheckOnly = (testCases: () => void): void => {
  void testCases
}

describe("typed JSX intrinsic elements", () => {
  it("renders typed HTML attributes", () => {
    const node = (
      <form
        method="post"
        enctype="multipart/form-data"
        novalidate
      >
        <label htmlFor="avatar">Avatar</label>
        <input
          id="avatar"
          type="file"
          accept="image/*"
          required
        />
        <button
          type="submit"
          disabled={false}
        >
          Upload
        </button>
      </form>
    )

    expect(renderToString(node)).toBe(
      '<form method="post" enctype="multipart/form-data" novalidate>' +
        '<label for="avatar">Avatar</label>' +
        '<input id="avatar" type="file" accept="image/*" required>' +
        '<button type="submit">Upload</button></form>'
    )
  })

  it("renders typed Datastar attributes", () => {
    const query = signal<string, "query">("query")

    const node = (
      <input
        type="search"
        data-bind={query}
        data-on:input={mod(get("/search"), { debounce: "300ms" })}
        data-attr:aria-busy={js`${query}.length > 0`}
      />
    )

    expect(renderToString(node)).toBe(
      '<input type="search" data-bind="query" data-on:input__debounce.300ms="@get(&quot;/search&quot;)" data-attr:aria-busy="$query.length &gt; 0">'
    )
  })

  it("checks values written by mutating Datastar attributes", () => {
    const text = signal<string>("fetching")
    const flag = signal<boolean>("element")
    const maybeFetching = signal<boolean | undefined>("maybeFetching")
    const form = signal<HTMLFormElement>("form")
    const anyElement = signal<Element>("anyElement")
    const button = signal<HTMLButtonElement>("button")
    const count = signal<number>("count")
    const structuralReference = {
      name: "structural",
      toDatastarExpression: () => "$structural"
    }

    const indicatorTarget: SignalTarget<boolean> = maybeFetching
    const readOnlyText: Expr<string> = text
    const writeOnlyText: SignalTarget<string> = text
    const textBinding: DatastarSignalReference<string, string> = text
    // @ts-expect-error A boolean signal cannot satisfy a string read/write binding.
    const invalidTextBinding: DatastarSignalReference<string, string> = flag
    void indicatorTarget
    void readOnlyText
    void writeOnlyText
    void textBinding
    void invalidTextBinding

    const nodes = [
      <button data-indicator={flag} />,
      <form data-ref={form} />,
      <form data-ref={anyElement} />,
      <select data-bind={count} />,
      // @ts-expect-error A readable expression alone cannot be used for two-way binding.
      <input data-bind={readOnlyText} />,
      // @ts-expect-error A write target alone cannot be used for two-way binding.
      <input data-bind={writeOnlyText} />,
      // @ts-expect-error data-indicator writes booleans, not strings.
      <button data-indicator={text} />,
      // @ts-expect-error data-ref writes the concrete element, not a boolean.
      <div data-ref={flag} />,
      // @ts-expect-error A form element cannot be written to a button-only signal.
      <form data-ref={button} />,
      // @ts-expect-error data-bind requires a branded readable and writable signal.
      <input data-bind={structuralReference} />
    ]

    expect(nodes).toHaveLength(10)
  })

  it("renders registered extensions and unregistered hyphenated custom elements", () => {
    const ready = signal<boolean, "ready">("ready")

    const nodes = [
      <div
        {...dataAttrs({ "data-rows": 3 })}
        hx-get="/fragment"
        x-data="{ open: false }"
      />,
      <typed-widget
        id="status"
        class="panel"
        aria-label="Status"
        mode="compact"
        count={2}
        data-show={ready}
        data-focus-when={ready}
      >
        Child
      </typed-widget>,
      <button data-focus-when={ready} />,
      <my-widget
        theme="dark"
        data-on:widget-loaded={js`${ready} = true`}
        data-rows={3}
        aria-roledescription="widget"
      >
        <svg
          viewBox="0 0 10 10"
          fill="none"
        >
          <circle
            cx={5}
            cy={5}
            r={4}
            data-show={ready}
          />
        </svg>
      </my-widget>
    ]

    expect(renderToString(nodes)).toBe(
      '<div data-rows="3" hx-get="/fragment" x-data="{ open: false }"></div>' +
        '<typed-widget id="status" class="panel" aria-label="Status" mode="compact" count="2" data-show="$ready" data-focus-when="$ready">Child</typed-widget>' +
        '<button data-focus-when="$ready"></button>' +
        '<my-widget theme="dark" data-on:widget-loaded="$ready = true" data-rows="3" aria-roledescription="widget">' +
        '<svg viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" data-show="$ready"></circle></svg>' +
        "</my-widget>"
    )
  })

  it("rejects mistyped tags, attributes, and event expressions at compile time", () => {
    const count = signal<number>("count")

    const nodes = [
      <a
        // @ts-expect-error href must be a string
        href={42}
      />,
      <button
        // @ts-expect-error type must be a button type keyword
        type="anchor"
      />,
      // @ts-expect-error data-show does not accept regular expressions
      <div data-show={/pattern/} />,
      // @ts-expect-error data-bind expects a signal reference or name
      <input data-bind={42} />,
      // @ts-expect-error data-on values must be expressions, not objects
      <div data-on:click={{ handler: true }} />,
      // @ts-expect-error void elements accept no children
      <input type="text">text</input>,
      // @ts-expect-error unknown intrinsic names must use the custom-element hyphen convention
      <butotn tyep="sumbit" />,
      // @ts-expect-error href is not valid on div elements
      <div href="/not-valid-on-div" />,
      // @ts-expect-error input types must be valid keywords
      <input type="serach" />,
      // @ts-expect-error event handlers require effect expressions
      <button data-on:click={count} />,
      // @ts-expect-error registered plugin attributes use their exact expression type
      <button data-focus-when={count} />,
      // @ts-expect-error registered vendor attributes use their exact value type
      <div hx-get={42} />,
      // @ts-expect-error registered custom elements use their exact props
      <typed-widget mode="wide" />,
      // @ts-expect-error registered custom elements validate official Datastar attribute values
      <typed-widget
        mode="compact"
        data-show={/pattern/}
      />
    ]

    expect(nodes).toHaveLength(14)
  })

  it("renders per-attribute modifier combinations the runtime accepts", () => {
    const node = (
      <form
        data-signals={mod({ count: 0 }, { ifMissing: true })}
        data-on:submit={mod(get("/search"), { prevent: true })}
      >
        <input data-bind={mod("accepted", { prop: "checked", event: "change" })} />
      </form>
    )

    expect(renderToString(node)).toBe(
      '<form data-signals__ifmissing="{&quot;count&quot;: 0}" data-on:submit__prevent="@get(&quot;/search&quot;)">' +
        '<input data-bind__prop.checked__event.change="accepted"></form>'
    )
  })

  it("rejects incompatible modifier combinations at compile time", () => {
    typecheckOnly(() => {
      const nodes = [
        // @ts-expect-error unknown modifier keys are rejected by mod()
        <button data-on:click={mod(get("/save"), { prevent: true, nope: true })} />,
        // @ts-expect-error data-signals does not accept the prevent modifier
        <form data-signals={mod({ count: 0 }, { prevent: true })} />,
        // @ts-expect-error data-on events do not accept the ifMissing modifier
        <button data-on:click={mod(get("/save"), { ifMissing: true })} />,
        // @ts-expect-error data-bind does not accept timing modifiers
        <input data-bind={mod("accepted", { debounce: "200ms" })} />,
        // @ts-expect-error data-ignore only accepts the self modifier
        <div data-ignore={mod({ prevent: true })} />,
        // @ts-expect-error data-init does not accept event modifiers
        <div data-init={mod("$count = 1", { debounce: "500ms" })} />,
        // @ts-expect-error data-on-signal-patch does not accept viewTransition
        <div data-on-signal-patch={mod("console.log(patch)", { viewTransition: true })} />
      ]
      const customEventAttrs: DatastarAttributes = {
        // @ts-expect-error custom data-on events do not accept the ifMissing modifier
        "data-on:widget-loaded": mod(get("/save"), { ifMissing: true })
      }

      void nodes
      void customEventAttrs
    })

    expect(true).toBe(true)
  })
})
