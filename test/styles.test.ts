import { describe, expect, it } from "vitest"
import { dataStyle, dataStyles, signal, ternary } from "../src/datastar.js"

describe("Datastar style helpers", () => {
  it("builds keyed data-style bindings", () => {
    const width = signal<number, "width">("width")

    expect(dataStyle("width", width)).toEqual({
      "data-style:width": "$width"
    })
  })

  it("builds object-form data-style bindings", () => {
    const color = signal<string, "color">("color")
    const visible = signal<boolean, "visible">("visible")

    expect(dataStyles({ color, display: ternary(visible, "block", "none") })).toEqual({
      "data-style": '{"color": $color, "display": ($visible ? "block" : "none")}'
    })
  })
})
