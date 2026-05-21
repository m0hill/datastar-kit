import { describe, expect, it } from "vitest"
import * as ds from "../src/ds/index.js"

describe("Datastar style helpers", () => {
  it("builds keyed data-style bindings", () => {
    const width = ds.signal<number, "width">("width")

    expect(ds.dataStyle("width", width)).toEqual({
      "data-style:width": "$width"
    })
  })

  it("builds object-form data-style bindings", () => {
    const color = ds.signal<string, "color">("color")

    expect(ds.dataStyles({ color, display: ds.expr('($visible ? "block" : "none")') })).toEqual({
      "data-style": '{"color": $color, "display": ($visible ? "block" : "none")}'
    })
  })
})
