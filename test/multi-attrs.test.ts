import { describe, expect, it } from "vitest"
import { dataAttrs, dataClasses, signal } from "../src/datastar.js"

describe("multi-attribute Datastar helpers", () => {
  it("builds object-form data-attr bindings", () => {
    const saving = signal<boolean, "saving">("saving")

    expect(dataAttrs({ disabled: saving, "aria-busy": saving })).toEqual({
      "data-attr": '{"disabled": $saving, "aria-busy": $saving}'
    })
  })

  it("builds object-form data-class bindings", () => {
    const active = signal<boolean, "active">("active")
    const saving = signal<boolean, "saving">("saving")

    expect(dataClasses({ active, loading: saving })).toEqual({
      "data-class": '{"active": $active, "loading": $saving}'
    })
  })

  it("supports class names with special characters through object-form data-class", () => {
    const active = signal<boolean, "active">("active")

    expect(dataClasses({ "hover:bg-blue-500/50": active })).toEqual({
      "data-class": '{"hover:bg-blue-500/50": $active}'
    })
  })
})
