import { describe, expect, it } from "vitest"
import { dataAttr, on, post, expr } from "../src/ds.js"
import { mergeProps } from "../src/html.js"

describe("prop merging", () => {
  it("keeps permissive props for ergonomic overrides", () => {
    expect(mergeProps({ class: "base" }, { class: "override", id: "x" })).toEqual({
      class: "override",
      id: "x"
    })
  })

  it("composes independent Datastar prop fragments", () => {
    expect(mergeProps(on("click", post("/save")), dataAttr("disabled", expr("$saving")))).toEqual({
      "data-on:click": '@post("/save")',
      "data-attr:disabled": "$saving"
    })
  })
})
