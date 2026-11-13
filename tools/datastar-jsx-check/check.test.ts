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
      "unregistered-custom-element-ref",
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
    expect(diagnostics[10]?.suggestion).toBe("data-show")
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

  it("reports nesting the HTML parser rewrites", () => {
    const diagnostics = checkProgram(fixtureProgram()).filter((diagnostic) =>
      diagnostic.file.endsWith("nesting.tsx")
    )

    expect(diagnostics.map((diagnostic) => diagnostic.message)).toEqual([
      "<div> inside <p>: the HTML parser closes the <p> first, so the browser's DOM will not match this markup",
      "<ul> inside <p>: the HTML parser closes the <p> first, so the browser's DOM will not match this markup",
      "<section> inside <p>: the HTML parser closes the <p> first, so the browser's DOM will not match this markup",
      "<a> inside <a>: the HTML parser closes the <a> first, so the browser's DOM will not match this markup",
      "<form> inside <form>: the HTML parser drops the inner <form> tag, so the browser's DOM will not match this markup",
      "<button> inside <button>: the HTML parser closes the <button> first, so the browser's DOM will not match this markup",
      "<li> inside <li>: the HTML parser closes the <li> first, so the browser's DOM will not match this markup",
      "<h2> inside <h1>: the HTML parser closes the <h1> first, so the browser's DOM will not match this markup",
      "<tr> inside <table>: the HTML parser inserts <tbody> around it, so the browser's DOM will not match this markup",
      "<tr> inside <table>: the HTML parser inserts <tbody> around it, so the browser's DOM will not match this markup",
      "<td> inside <tbody>: the HTML parser inserts <tr> around it, so the browser's DOM will not match this markup",
      "<div> inside <table>: the HTML parser moves it out of the <table>, so the browser's DOM will not match this markup",
      "Text inside <tr>: the HTML parser moves it out of the <tr>, so the browser's DOM will not match this markup",
      "Text inside <colgroup>: the HTML parser moves it out of the <colgroup>, so the browser's DOM will not match this markup"
    ])
    expect(new Set(diagnostics.map((diagnostic) => diagnostic.code))).toEqual(
      new Set(["invalid-html-nesting"])
    )
  })
})
