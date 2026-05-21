import { describe, expect, it } from "vitest"
import { ignore, ignoreMorph } from "../src/ds/index.js"

describe("Datastar ignore helpers", () => {
  it("builds data-ignore attributes", () => {
    expect(ignore()).toEqual({ "data-ignore": true })
  })

  it("builds self-only data-ignore attributes", () => {
    expect(ignore({ self: true })).toEqual({ "data-ignore__self": true })
  })

  it("builds data-ignore-morph attributes", () => {
    expect(ignoreMorph()).toEqual({ "data-ignore-morph": true })
  })
})
