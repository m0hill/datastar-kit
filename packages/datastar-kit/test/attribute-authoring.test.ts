import { describe, expect, it } from "vitest"
import {
  inspectDatastarAttributeName,
  isDatastarPresenceAttribute,
  normalizeDatastarAttribute
} from "../src/ds/attribute-authoring.js"
import { datastarAttributeDefinitions } from "../src/ds/attribute-metadata.js"
import type { DatastarAttributes } from "../src/ds/attribute-types.js"
import { js } from "../src/ds/expression.js"
import { mod } from "../src/ds/modifiers.js"
import { signal } from "../src/ds/signals.js"

type AttributeDefinition = (typeof datastarAttributeDefinitions)[number]

type MissingExactProjection<Definition> = Definition extends {
  readonly name: infer Name extends string
  readonly key: infer Key
}
  ? Key extends "required"
    ? never
    : Name extends keyof DatastarAttributes
      ? never
      : Name
  : never

type UnexpectedExactProjection<Definition> = Definition extends {
  readonly name: infer Name extends string
  readonly key: infer Key
}
  ? Key extends "required"
    ? Name extends keyof DatastarAttributes
      ? Name
      : never
    : never
  : never

type MissingKeyedProjection<Definition> = Definition extends {
  readonly name: infer Name extends string
  readonly key: infer Key
}
  ? Key extends "forbidden"
    ? never
    : `${Name}:${string}` extends keyof DatastarAttributes
      ? never
      : Name
  : never

type UnexpectedKeyedProjection<Definition> = Definition extends {
  readonly name: infer Name extends string
  readonly key: infer Key
}
  ? Key extends "forbidden"
    ? `${Name}:${string}` extends keyof DatastarAttributes
      ? Name
      : never
    : never
  : never

type ProjectionConforms = [MissingExactProjection<AttributeDefinition>] extends [never]
  ? [UnexpectedExactProjection<AttributeDefinition>] extends [never]
    ? [MissingKeyedProjection<AttributeDefinition>] extends [never]
      ? [UnexpectedKeyedProjection<AttributeDefinition>] extends [never]
        ? true
        : false
      : false
    : false
  : false

const projectionConforms: ProjectionConforms = true

describe("Datastar attribute authoring", () => {
  it("normalizes ordinary, expression, signal-name, custom, and modified attributes", () => {
    const query = signal<string>("query")

    expect(normalizeDatastarAttribute("id", "search")).toEqual({
      name: "id",
      value: "search"
    })
    expect(normalizeDatastarAttribute("data-show", false)).toEqual({
      name: "data-show",
      value: "false"
    })
    expect(normalizeDatastarAttribute("data-bind", query)).toEqual({
      name: "data-bind",
      value: "query"
    })
    expect(normalizeDatastarAttribute("data-custom", { ready: true })).toEqual({
      name: "data-custom",
      value: '{"ready": true}'
    })
    expect(
      normalizeDatastarAttribute("data-on:click", mod(js<void>("$count++"), { prevent: true }))
    ).toEqual({
      name: "data-on:click__prevent",
      value: "$count++"
    })
  })

  it("inspects canonical names without exposing metadata and modifier coordination", () => {
    expect(inspectDatastarAttributeName("data-show")).toEqual({
      _tag: "known",
      name: "data-show"
    })
    expect(inspectDatastarAttributeName("data-on:click__prevent")).toEqual({
      _tag: "known",
      name: "data-on"
    })
    expect(inspectDatastarAttributeName("data-shwo:key__once")).toEqual({
      _tag: "custom",
      baseName: "data-shwo",
      suggestion: "data-show"
    })
    expect(inspectDatastarAttributeName("data-on")).toEqual({
      _tag: "invalid",
      category: "key",
      message: "\"data-on\" requires a key after ':'"
    })
    expect(inspectDatastarAttributeName("data-show:panel")).toEqual({
      _tag: "invalid",
      category: "key",
      message: '"data-show" does not accept a key'
    })
    expect(inspectDatastarAttributeName("data-on:click__prop.value")).toEqual({
      _tag: "invalid",
      category: "modifier",
      message: 'Modifier "prop" is not valid on "data-on:click"'
    })
  })

  it("keeps presence behavior and the static attribute forms aligned with canonical policy", () => {
    expect(isDatastarPresenceAttribute("data-ignore__self")).toBe(true)
    expect(isDatastarPresenceAttribute("data-signals:result__ifmissing")).toBe(true)
    expect(isDatastarPresenceAttribute("data-show")).toBe(false)
    expect(projectionConforms).toBe(true)
  })
})
