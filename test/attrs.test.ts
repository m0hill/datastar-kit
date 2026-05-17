import { describe, expect, it } from "vitest"
import { AttributeConflictError, dataAttr, mergeAttrs, mergeAttrsStrict, on, post, raw } from "../src/datastar.js"

describe("attribute merging", () => {
  it("keeps permissive mergeAttrs for ergonomic overrides", () => {
    expect(mergeAttrs({ class: "base" }, { class: "override", id: "x" })).toEqual({
      class: "override",
      id: "x"
    })
  })

  it("offers strict merging when accidental collisions should fail", () => {
    expect(() => mergeAttrsStrict({ id: "a" }, { id: "b" })).toThrow(AttributeConflictError)
  })

  it("strictly merges independent Datastar attribute fragments", () => {
    expect(mergeAttrsStrict(on("click", post("/save")), dataAttr("disabled", raw("$saving")))).toEqual({
      "data-on:click": '@post("/save")',
      "data-attr:disabled": "$saving"
    })
  })

  it("reports the duplicate attribute name", () => {
    try {
      mergeAttrsStrict({ id: "a" }, { id: "b" })
    } catch (error) {
      expect(error).toBeInstanceOf(AttributeConflictError)
      expect((error as AttributeConflictError).attribute).toBe("id")
    }
  })
})
