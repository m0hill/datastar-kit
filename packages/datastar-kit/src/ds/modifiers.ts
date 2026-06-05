/**
 * Structured timing options for Datastar debounce and throttle modifiers.
 */
export type TimingModifierOptions = Readonly<{
  duration: string | number
  leading?: boolean
  noTrailing?: boolean
  noLeading?: boolean
  trailing?: boolean
}>

/** Supported Datastar key casing conversions. */
export type CaseModifier = "camel" | "kebab" | "snake" | "pascal"

/**
 * Modifier bag accepted by Datastar Kit's explicit modifier wrapper.
 *
 * The JSX runtime turns these options into Datastar's `__modifier` attribute-name suffixes.
 */
export type DatastarModifierOptions = Readonly<{
  capture?: boolean
  case?: CaseModifier
  debounce?: boolean | string | number | TimingModifierOptions
  delay?: boolean | string | number
  document?: boolean
  duration?: boolean | string | number
  event?: string | readonly string[]
  exit?: boolean
  full?: boolean
  half?: boolean
  ifMissing?: boolean
  leading?: boolean
  once?: boolean
  outside?: boolean
  passive?: boolean
  prevent?: boolean
  prop?: string
  self?: boolean
  stop?: boolean
  terse?: boolean
  threshold?: string | number
  throttle?: boolean | string | number | TimingModifierOptions
  viewTransition?: boolean
  window?: boolean
}>

const datastarModifiedValueBrand: unique symbol = Symbol("datastar-kit.modified-value")

/** A value plus Datastar modifiers that should be rendered onto the attribute name. */
export interface DatastarModifiedValue<Value = unknown> {
  readonly [datastarModifiedValueBrand]: true
  readonly value: Value
  readonly modifiers: DatastarModifierOptions
}

const isModifierOptions = (value: unknown): value is DatastarModifierOptions =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const modifiedValue = <Value>(
  value: Value,
  modifiers: DatastarModifierOptions
): DatastarModifiedValue<Value> => {
  const modified: DatastarModifiedValue<Value> = {
    [datastarModifiedValueBrand]: true,
    value,
    modifiers: Object.freeze({ ...modifiers })
  }
  return Object.freeze(modified)
}

/**
 * Wraps an attribute value with Datastar modifiers.
 *
 * Use `mod(value, modifiers)` for normal value-bearing Datastar attributes. Use the one-argument
 * form only for presence attributes whose raw Datastar form has no value, such as
 * `data-ignore__self`.
 *
 * @example
 * ```tsx
 * <form data-on:submit={mod(post("/signup"), { prevent: true })} />
 * <input data-on:input={mod(get("/search"), { debounce: "200ms" })} />
 * <div data-ignore={mod({ self: true })} />
 * ```
 */
export function mod(modifiers: DatastarModifierOptions): DatastarModifiedValue<true>
export function mod<const Value>(
  value: Value,
  modifiers: DatastarModifierOptions
): DatastarModifiedValue<Value>
export function mod<const Value>(
  valueOrModifiers: Value,
  modifiers?: DatastarModifierOptions
): DatastarModifiedValue<Value | true> {
  if (modifiers !== undefined) {
    return modifiedValue(valueOrModifiers, modifiers)
  }

  if (!isModifierOptions(valueOrModifiers)) {
    throw new TypeError("Datastar modifiers must be an object")
  }

  return modifiedValue(true, valueOrModifiers)
}

/** @internal */
export const isDatastarModifiedValue = (value: unknown): value is DatastarModifiedValue =>
  typeof value === "object" &&
  value !== null &&
  datastarModifiedValueBrand in value &&
  value[datastarModifiedValueBrand] === true
