import { describe, expect, it } from "vitest"
import { dataAttrs } from "../src/data-attributes.js"
import { signal } from "../src/ds/index.js"
import { renderToString } from "../src/html.js"

describe("custom data attributes", () => {
  it("spreads primitive data attributes without weakening direct JSX props", () => {
    const node = <li {...dataAttrs({ "data-id": 7, "data-completed": false })}>Todo</li>

    expect(renderToString(node)).toBe('<li data-id="7" data-completed="false">Todo</li>')
  })

  it("rejects non-data keys and rich values at compile time", () => {
    if (false) {
      // @ts-expect-error dataAttrs only accepts data-* keys.
      dataAttrs({ id: "todo-1" })
      // @ts-expect-error Arbitrary dataset values must be primitive.
      dataAttrs({ "data-state": signal<string>("state") })
    }

    expect(dataAttrs({ "data-state": "ready" })).toEqual({ "data-state": "ready" })
  })
})
