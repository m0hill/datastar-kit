import { describe, expect, it } from "vitest"
import { onSignalPatch, onSignalPatchFilter, post, regex } from "../src/ds/index.js"
import { mergeProps } from "../src/html.js"

describe("signal patch helpers", () => {
  it("builds signal patch filter attributes", () => {
    expect(onSignalPatchFilter({ include: regex("^counter$"), exclude: regex("_temp$") })).toEqual({
      "data-on-signal-patch-filter":
        '{"include": new RegExp("^counter$", ""), "exclude": new RegExp("_temp$", "")}'
    })
  })

  it("composes signal patch listeners and filters", () => {
    expect(
      mergeProps(
        onSignalPatch(post("/autosave"), { debounce: 500 }),
        onSignalPatchFilter({ include: regex("^draft") })
      )
    ).toEqual({
      "data-on-signal-patch__debounce.500ms": '@post("/autosave")',
      "data-on-signal-patch-filter": '{"include": new RegExp("^draft", "")}'
    })
  })
})
