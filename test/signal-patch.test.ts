import { describe, expect, it } from "vitest"
import { mergeAttrsStrict, onSignalPatch, onSignalPatchFilter, post, regex } from "../src/datastar.js"

describe("signal patch helpers", () => {
  it("builds signal patch filter attributes", () => {
    expect(onSignalPatchFilter({ include: regex("^counter$"), exclude: regex("_temp$") })).toEqual({
      "data-on-signal-patch-filter": '{"include": /^counter$/, "exclude": /_temp$/}'
    })
  })

  it("composes signal patch listeners and filters", () => {
    expect(
      mergeAttrsStrict(
        onSignalPatch(post("/autosave"), { debounce: 500 }),
        onSignalPatchFilter({ include: regex("^draft") })
      )
    ).toEqual({
      "data-on-signal-patch__debounce.500ms": '@post("/autosave")',
      "data-on-signal-patch-filter": '{"include": /^draft/}'
    })
  })
})
