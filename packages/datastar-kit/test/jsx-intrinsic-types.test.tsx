import { describe, expect, it } from "vitest"
import { get, js, mod, signal } from "../src/ds/index.js"
import { renderToString } from "../src/html.js"

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

  it("renders unknown tags and attributes through the escape hatches", () => {
    const ready = signal<boolean, "ready">("ready")

    const node = (
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
    )

    expect(renderToString(node)).toBe(
      '<my-widget theme="dark" data-on:widget-loaded="$ready = true" data-rows="3" aria-roledescription="widget">' +
        '<svg viewBox="0 0 10 10" fill="none"><circle cx="5" cy="5" r="4" data-show="$ready"></circle></svg>' +
        "</my-widget>"
    )
  })

  it("rejects mistyped attribute values at compile time", () => {
    const nodes = [
      <a
        // @ts-expect-error href must be a string
        href={42}
      />,
      <button
        // @ts-expect-error type must be a button type keyword
        type="anchor"
      />,
      <div
        // @ts-expect-error unknown attributes are rejected on known tags
        unknownattr="x"
      />,
      // @ts-expect-error data-show does not accept regular expressions
      <div data-show={/pattern/} />,
      // @ts-expect-error data-bind expects a signal reference or name
      <input data-bind={42} />,
      // @ts-expect-error data-on values must be expressions, not objects
      <div data-on:click={{ handler: true }} />,
      // @ts-expect-error void elements accept no children
      <input type="text">text</input>
    ]

    expect(nodes).toHaveLength(7)
  })
})
