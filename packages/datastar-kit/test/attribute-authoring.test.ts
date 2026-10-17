import { describe, expect, it } from "vitest"
import { inspectDatastarAttributeName } from "../src/ds/attribute-authoring.js"
import {
  datastarAttributeDefinitions,
  type DatastarModifierTarget
} from "../src/ds/attribute-metadata.js"
import type { DatastarAttributes } from "../src/ds/attribute-types.js"
import type { DatastarModifierKeysFor } from "../src/ds/modifier-rendering.js"
import type { DatastarModifiedValue } from "../src/ds/modifiers.js"

// The JSX attribute types are written by hand, while the runtime renders keys and modifiers from
// `datastarAttributeDefinitions`. These checks fail typechecking when the two drift apart.
type AttributeDefinition = (typeof datastarAttributeDefinitions)[number]

type Equal<Left, Right> = [Left] extends [Right] ? ([Right] extends [Left] ? true : false) : false

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

type TypedModifierKeys<Value> =
  Value extends DatastarModifiedValue<unknown, infer Keys, infer _Modifiers> ? Keys : never

type RuntimeModifierKeys<Target> = [Target] extends [DatastarModifierTarget]
  ? DatastarModifierKeysFor<Target>
  : never

type ExactModifierDrift<Definition> = Definition extends {
  readonly name: infer Name extends keyof DatastarAttributes
}
  ? Equal<
      TypedModifierKeys<DatastarAttributes[Name]>,
      RuntimeModifierKeys<
        Definition extends { readonly exactModifierTarget: infer Target } ? Target : never
      >
    > extends true
    ? never
    : Name
  : never

type KeyedModifierDrift<Definition> = Definition extends {
  readonly name: infer Name extends string
  readonly key: "optional" | "required"
}
  ? Equal<
      TypedModifierKeys<
        `${Name}:key` extends keyof DatastarAttributes ? DatastarAttributes[`${Name}:key`] : never
      >,
      RuntimeModifierKeys<
        Definition extends { readonly keyedModifierTarget: infer Target } ? Target : never
      >
    > extends true
    ? never
    : `${Name}:*`
  : never

// Resolves to `true` when there is no drift, or to the drifting attribute names otherwise, so a
// failed assignment below names the offending attribute in the type error.
type NoDrift<Names> = [Names] extends [never] ? true : Names

const driftChecks: readonly true[] = [
  true satisfies NoDrift<MissingExactProjection<AttributeDefinition>>,
  true satisfies NoDrift<UnexpectedExactProjection<AttributeDefinition>>,
  true satisfies NoDrift<MissingKeyedProjection<AttributeDefinition>>,
  true satisfies NoDrift<UnexpectedKeyedProjection<AttributeDefinition>>,
  true satisfies NoDrift<ExactModifierDrift<AttributeDefinition>>,
  true satisfies NoDrift<KeyedModifierDrift<AttributeDefinition>>
]
void driftChecks

describe("inspectDatastarAttributeName", () => {
  it("classifies canonical names, ignoring keys and modifiers", () => {
    expect(inspectDatastarAttributeName("data-show")).toEqual({ _tag: "known", name: "data-show" })
    expect(inspectDatastarAttributeName("data-on:click__prevent")).toEqual({
      _tag: "known",
      name: "data-on"
    })
  })

  it("suggests the nearest canonical name for likely typos", () => {
    expect(inspectDatastarAttributeName("data-shwo:key__once")).toEqual({
      _tag: "custom",
      baseName: "data-shwo",
      suggestion: "data-show"
    })
    expect(inspectDatastarAttributeName("data-tooltip")).toEqual({
      _tag: "custom",
      baseName: "data-tooltip",
      suggestion: undefined
    })
  })

  it("reports key policy violations", () => {
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
    expect(inspectDatastarAttributeName("data-attr:")).toEqual({
      _tag: "invalid",
      category: "key",
      message: '"data-attr" has an empty key'
    })
  })

  it("reports unknown, misplaced, and unsupported modifiers", () => {
    expect(inspectDatastarAttributeName("data-on:click__preevent")).toEqual({
      _tag: "invalid",
      category: "modifier",
      message: 'Unknown Datastar modifier "preevent"'
    })
    expect(inspectDatastarAttributeName("data-on:click__prop.value")).toEqual({
      _tag: "invalid",
      category: "modifier",
      message: 'Modifier "prop" is not valid on "data-on:click"'
    })
    expect(inspectDatastarAttributeName("data-show__once")).toEqual({
      _tag: "invalid",
      category: "modifier",
      message: '"data-show" does not accept modifiers'
    })
  })
})
