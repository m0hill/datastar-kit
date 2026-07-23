import path from "node:path"
import { describe, expect, it } from "vitest"
import { checkProgram } from "./check.js"
import { loadProject } from "./load-project.js"

const fixtureConfig = path.join(import.meta.dirname, "fixtures", "tsconfig.json")

const fixtureProgram = () => {
  const result = loadProject(fixtureConfig)
  if (result._tag === "invalid") {
    throw new Error("Expected the checker fixture project to load")
  }
  return result.project.program
}

describe("Datastar JSX checker", () => {
  it("uses TypeScript types and JSX registrations without flagging valid extensions", () => {
    const diagnostics = checkProgram(fixtureProgram())

    expect(diagnostics.some((diagnostic) => diagnostic.file.endsWith("positive.tsx"))).toBe(false)
  })

  it("reports unknown names, invalid keys and modifiers, and unregistered rich values", () => {
    const diagnostics = checkProgram(fixtureProgram()).filter((diagnostic) =>
      diagnostic.file.endsWith("negative.tsx")
    )

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "unknown-aria-attribute",
      "unknown-datastar-attribute",
      "unregistered-rich-data-attribute",
      "invalid-datastar-key",
      "invalid-datastar-key",
      "invalid-datastar-modifier",
      "invalid-datastar-modifier",
      "unknown-aria-attribute",
      "unknown-datastar-attribute",
      "unknown-datastar-attribute",
      "unsupported-rich-attribute",
      "unsupported-rich-attribute",
      "unsupported-rich-attribute",
      "unsupported-rich-attribute",
      "unsupported-rich-attribute",
      "unsupported-rich-attribute",
      "unsupported-rich-attribute",
      "unsupported-rich-attribute",
      "unsupported-rich-attribute",
      "unknown-vendor-attribute"
    ])
    expect(diagnostics[0]?.suggestion).toBe("aria-label")
    expect(diagnostics[1]?.suggestion).toBe("data-show")
    expect(diagnostics[7]?.suggestion).toBe("aria-label")
    expect(diagnostics[8]?.suggestion).toBe("data-show")
    expect(diagnostics[9]?.suggestion).toBe("data-show")
    expect(
      diagnostics
        .filter((diagnostic) => diagnostic.code === "unsupported-rich-attribute")
        .map((diagnostic) => diagnostic.message)
    ).toEqual([
      'Attribute "custom-object" only accepts primitive values; expressions, arrays, and objects require a data-* attribute',
      'Attribute "custom-expression" only accepts primitive values; expressions, arrays, and objects require a data-* attribute',
      'Attribute "payload" only accepts primitive values; expressions, arrays, and objects require a data-* attribute',
      'Attribute "payload" only accepts primitive values; expressions, arrays, and objects require a data-* attribute',
      'Attribute "custom-object" only accepts primitive values; expressions, arrays, and objects require a data-* attribute',
      'Attribute "payload" only accepts primitive values; expressions, arrays, and objects require a data-* attribute',
      'Attribute "custom-expression" only accepts primitive values; expressions, arrays, and objects require a data-* attribute',
      'Attribute "<computed attribute>" only accepts primitive values; expressions, arrays, and objects require a data-* attribute',
      'Attribute "custom-object" only accepts primitive values; expressions, arrays, and objects require a data-* attribute'
    ])
    expect(diagnostics.every((diagnostic) => diagnostic.start >= 0)).toBe(true)
  })
})
