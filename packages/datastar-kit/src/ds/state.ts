import type { HtmlProps } from "../html.js"
import type { SignalState, SignalValue } from "../types.js"
import { dataSignals, type DataSignalsOptions } from "./attributes.js"
import { assertSignalName, Signal, SignalNameError } from "./signals.js"

type SignalObject = Readonly<Record<string, SignalValue>>

type WidenSignalValue<Value extends SignalValue> = Value extends string
  ? string
  : Value extends number
    ? number
    : Value extends boolean
      ? boolean
      : Value extends null
        ? null
        : Value extends readonly (infer Item extends SignalValue)[]
          ? readonly WidenSignalValue<Item>[]
          : Value extends SignalObject
            ? WidenSignalObject<Value>
            : Value

type WidenSignalObject<T extends SignalObject> = {
  readonly [Key in keyof T & string]: WidenSignalValue<T[Key]>
}

type SignalRefFor<Value extends SignalValue, Name extends string> = [Value] extends [
  readonly SignalValue[]
]
  ? Signal<Value, Name>
  : [Value] extends [SignalObject]
    ? StateSignalRefs<Value, Name>
    : Signal<Value, Name>

type StatePatchValue<Value extends SignalValue> = [Value] extends [readonly SignalValue[]]
  ? Value
  : [Value] extends [SignalObject]
    ? StatePatch<Value>
    : Value

/** Nested typed Datastar signal references for a `ds.state(...)` object. */
export type StateSignalRefs<T extends SignalObject, Prefix extends string = ""> = {
  readonly [Key in keyof T & string]: SignalRefFor<
    T[Key],
    Prefix extends "" ? Key : `${Prefix}.${Key}`
  >
}

/** Type-checked partial signal patch accepted by a `ds.state(...)` helper. */
export type StatePatch<T extends SignalObject> = {
  readonly [Key in keyof T & string]?: StatePatchValue<T[Key]>
}

/** Options for `state.attrs()`. */
export interface StateAttrsOptions extends DataSignalsOptions {}

/** A typed signal-state helper created by `ds.state(...)`. */
export interface State<T extends SignalObject> {
  /** Initial signal values supplied to `ds.state(...)`. */
  readonly defaults: T
  /** Nested typed signal refs. */
  readonly refs: StateSignalRefs<T>
  /** Short alias for `refs`, matching Datastar's `$signal` expression syntax. */
  readonly $: StateSignalRefs<T>
  /** Creates `data-signals` attributes for the initial state. Defaults to `ifMissing: true`. */
  attrs(options?: StateAttrsOptions): HtmlProps
  /** Returns a type-checked signal patch object for `event.signals(...)` or `reply.signals(...)`. */
  patch(values: StatePatch<T>): SignalState
  /** Returns the default state, optionally deep-merged with overrides. */
  reset(overrides?: StatePatch<T>): SignalState
}

const isSignalObject = (value: SignalValue): value is SignalObject =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const cloneSignalValue = (value: SignalValue): SignalValue => {
  if (Array.isArray(value)) {
    return value.map(cloneSignalValue)
  }

  if (isSignalObject(value)) {
    return cloneSignalState(value)
  }

  return value
}

const cloneSignalState = (value: SignalObject): SignalState => {
  const cloned: Record<string, SignalValue> = {}
  for (const [key, item] of Object.entries(value)) {
    cloned[key] = cloneSignalValue(item)
  }
  return cloned
}

const mergeSignalValue = (base: SignalValue | undefined, override: SignalValue): SignalValue => {
  if (base !== undefined && isSignalObject(base) && isSignalObject(override)) {
    return mergeSignalState(base, override)
  }

  return cloneSignalValue(override)
}

const mergeSignalState = (base: SignalObject, overrides: SignalObject): SignalState => {
  const merged: Record<string, SignalValue> = cloneSignalState(base)

  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = mergeSignalValue(base[key], value)
  }

  return merged
}

const assertStateKey = (key: string): void => {
  if (key.includes(".")) {
    throw new SignalNameError(key)
  }

  assertSignalName(key)
}

const buildRefs = (value: SignalObject, prefix = ""): Record<string, unknown> => {
  const refs: Record<string, unknown> = {}

  for (const [key, item] of Object.entries(value)) {
    assertStateKey(key)
    const name = prefix.length === 0 ? key : `${prefix}.${key}`
    refs[key] = isSignalObject(item) ? buildRefs(item, name) : new Signal(name)
  }

  return refs
}

/**
 * Creates a small typed helper around Datastar signal defaults.
 *
 * `ds.state(...)` keeps initial values, signal refs, reset payloads, and partial signal patches
 * derived from one object. It does not read requests or perform schema validation.
 */
export const state = <T extends SignalObject>(defaults: T): State<WidenSignalObject<T>> => {
  const clonedDefaults = cloneSignalState(defaults) as WidenSignalObject<T>
  const refs = buildRefs(clonedDefaults) as StateSignalRefs<WidenSignalObject<T>>

  return {
    defaults: clonedDefaults,
    refs,
    $: refs,
    attrs(options = {}) {
      return dataSignals(clonedDefaults, { ...options, ifMissing: options.ifMissing ?? true })
    },
    patch(values) {
      return cloneSignalState(values as SignalObject)
    },
    reset(overrides) {
      return overrides === undefined
        ? cloneSignalState(clonedDefaults)
        : mergeSignalState(clonedDefaults, overrides as SignalObject)
    }
  }
}
