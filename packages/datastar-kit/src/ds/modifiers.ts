/** Structured options for Datastar's `debounce` modifier, which fires on the trailing edge. */
export type DebounceModifierOptions = Readonly<{
  duration: string | number
  /** Also fire on the leading edge. */
  leading?: boolean
  /** Skip the trailing-edge call. */
  noTrailing?: boolean
}>

/** Structured options for Datastar's `throttle` modifier, which fires on the leading edge. */
export type ThrottleModifierOptions = Readonly<{
  duration: string | number
  /** Skip the leading-edge call. */
  noLeading?: boolean
  /** Also fire on the trailing edge. */
  trailing?: boolean
}>

/** Structured timing options for Datastar debounce and throttle modifiers. */
export type TimingModifierOptions = DebounceModifierOptions | ThrottleModifierOptions

/** @internal Supported Datastar key casing conversions used by the JSX modifier cleaner. */
export const datastarCaseModifiers = ["camel", "kebab", "snake", "pascal"] as const

/** Supported Datastar key casing conversions. */
export type CaseModifier = (typeof datastarCaseModifiers)[number]

/**
 * Modifier bag accepted by Datastar Kit's explicit modifier wrapper.
 *
 * The JSX runtime turns these options into Datastar's `__modifier` attribute-name suffixes.
 */
type DurationModifier = boolean | string | number

export type DatastarModifierOptions = Readonly<{
  capture?: boolean
  case?: CaseModifier
  debounce?: DurationModifier | DebounceModifierOptions
  delay?: DurationModifier
  document?: boolean
  duration?: DurationModifier
  /**
   * Events that sync a `data-bind` element back to its signal. Using it without `prop` requires
   * Datastar 1.0.1 or newer; on 1.0.0, set both.
   */
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
  /**
   * Element property that `data-bind` reads and writes. Using it without `event` requires Datastar
   * 1.0.1 or newer; on 1.0.0, set both.
   */
  prop?: string
  self?: boolean
  stop?: boolean
  terse?: boolean
  threshold?: string | number
  throttle?: DurationModifier | ThrottleModifierOptions
  viewTransition?: boolean
  window?: boolean
}>

/** @internal */
export type DatastarModifierKey = keyof DatastarModifierOptions

type KnownModifierKeys<Modifiers> = Extract<keyof Modifiers, DatastarModifierKey>

type UnknownModifierMessage<Key extends PropertyKey> = Key extends string
  ? `Unknown Datastar modifier: ${Key}`
  : "Unknown Datastar modifier"

// Generic inference skips excess-property checks, so a flag from the other timing modifier, such as
// `throttle: { leading: true }`, is mapped to the exact options type to surface the error.
type ExactTimingOptions<Value, Options> = Value extends { readonly duration: unknown }
  ? Exclude<keyof Value, keyof Options> extends never
    ? Value
    : Options
  : Value

type NoUnknownModifierKeys<Modifiers extends DatastarModifierOptions> =
  Exclude<keyof Modifiers, DatastarModifierKey> extends never
    ? Extract<keyof Modifiers, "debounce" | "throttle"> extends never
      ? Modifiers
      : {
          [Key in keyof Modifiers]: Key extends "debounce"
            ? ExactTimingOptions<Modifiers[Key], DebounceModifierOptions>
            : Key extends "throttle"
              ? ExactTimingOptions<Modifiers[Key], ThrottleModifierOptions>
              : Modifiers[Key]
        }
    : UnknownModifierMessage<Exclude<keyof Modifiers, DatastarModifierKey>>

const datastarModifiedValueBrand: unique symbol = Symbol("datastar-kit.modified-value")
const datastarModifiedModifierKeysBrand: unique symbol = Symbol(
  "datastar-kit.modified-modifier-keys"
)

/**
 * A value plus Datastar modifiers that should be rendered onto the attribute name.
 *
 * @typeParam Value Wrapped attribute value.
 * @typeParam ModifierKeys Modifier keys present in the wrapper.
 * @typeParam Modifiers Exact modifier options, retained so attribute types can recognize semantic
 * modifiers such as `prop`.
 */
export interface DatastarModifiedValue<
  Value = unknown,
  ModifierKeys extends DatastarModifierKey = DatastarModifierKey,
  Modifiers extends DatastarModifierOptions = DatastarModifierOptions
> {
  readonly [datastarModifiedValueBrand]: true
  readonly [datastarModifiedModifierKeysBrand]: ModifierKeys | undefined
  readonly value: Value
  readonly modifiers: Modifiers
}

const isModifierOptions = (value: unknown): value is DatastarModifierOptions =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const modifiedValue = <Value, Modifiers extends DatastarModifierOptions>(
  value: Value,
  modifiers: Modifiers
): DatastarModifiedValue<Value, KnownModifierKeys<Modifiers>, Modifiers> => {
  const modified: DatastarModifiedValue<Value, KnownModifierKeys<Modifiers>, Modifiers> = {
    [datastarModifiedValueBrand]: true,
    [datastarModifiedModifierKeysBrand]: undefined,
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
export function mod<const Modifiers extends DatastarModifierOptions>(
  modifiers: NoUnknownModifierKeys<Modifiers>
): DatastarModifiedValue<true, KnownModifierKeys<Modifiers>, Modifiers>
export function mod<const Value, const Modifiers extends DatastarModifierOptions>(
  value: Value,
  modifiers: NoUnknownModifierKeys<Modifiers>
): DatastarModifiedValue<Value, KnownModifierKeys<Modifiers>, Modifiers>
export function mod<const Value>(
  valueOrModifiers: Value,
  modifiers?: unknown
): DatastarModifiedValue<Value | true> {
  if (modifiers !== undefined) {
    if (!isModifierOptions(modifiers)) {
      throw new TypeError("Datastar modifiers must be an object")
    }
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
