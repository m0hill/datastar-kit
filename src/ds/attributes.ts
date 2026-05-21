import type { HtmlProps } from "../html.js"
import type { SignalFilter } from "./actions.js"
import { isExpr, toJs, type DatastarFunction, type Expr, type ExprInput } from "./expression.js"
import {
  appendTimingModifiers,
  bindModifiers,
  caseModifierSuffix,
  dataSignalModifiers,
  initModifiers,
  intersectModifiers,
  intervalModifiers,
  modifierSuffix,
  onModifiers,
  type BindModifiers,
  type CaseModifiers,
  type DataSignalModifiers,
  type InitModifiers,
  type IntersectModifiers,
  type IntervalModifiers,
  type OnModifiers,
  type TimingModifiers
} from "./modifiers.js"
import { assertSignalName, type Signal, type SignalStateInput, type SignalValueInput } from "./signals.js"

/** Options for `ds.jsonSignals()`. */
export interface JsonSignalsOptions {
  /** Render compact JSON without indentation. */
  readonly terse?: boolean
}

/** Options for `ds.ignore()`. */
export interface IgnoreOptions {
  /** Ignore the element itself but not its descendants. */
  readonly self?: boolean
}

/** Options for `ds.dataSignals()`. */
export interface DataSignalsOptions {
  /** Only set signal values when their keys are missing. */
  readonly ifMissing?: boolean
}

/** A nested object of computed signal functions. */
export type DataComputedValue = Expr<DatastarFunction<unknown>> | { readonly [key: string]: DataComputedValue }

/** Object-valued `data-computed` input. */
export type DataComputedObject = Readonly<Record<string, DataComputedValue>>

const assertUnmodifiedSignalName = (name: string, modifiers: CaseModifiers): void => {
  if (modifiers.case === undefined) {
    assertSignalName(name)
  }
}

const signalKeyName = <Name extends string>(name: Name | { readonly name: Name }): Name =>
  typeof name === "string" ? name : name.name

const assertDataComputedObjectKeys = (values: DataComputedObject): void => {
  for (const [key, value] of Object.entries(values)) {
    assertSignalName(key)

    if (!isExpr(value)) {
      assertDataComputedObjectKeys(value)
    }
  }
}

const assertSignalObjectKeys = (values: SignalStateInput): void => {
  for (const [key, value] of Object.entries(values)) {
    assertSignalName(key)

    if (typeof value === "object" && value !== null && !Array.isArray(value) && !isExpr(value)) {
      assertSignalObjectKeys(value as SignalStateInput)
    }
  }
}

/** Creates a Datastar `data-on:*` attribute. @see https://data-star.dev/reference/attributes#data-on */
export const on = (event: string, expression: ExprInput<unknown>, modifiers?: OnModifiers): HtmlProps => ({
  [`data-on:${event}${onModifiers(modifiers)}`]: toJs(expression)
})

/** Creates a Datastar `data-on-intersect` attribute. @see https://data-star.dev/reference/attributes#data-on-intersect */
export const onIntersect = (expression: ExprInput<unknown>, modifiers?: IntersectModifiers): HtmlProps => ({
  [`data-on-intersect${intersectModifiers(modifiers)}`]: toJs(expression)
})

/** Creates a Datastar `data-on-interval` attribute. @see https://data-star.dev/reference/attributes#data-on-interval */
export const onInterval = (expression: ExprInput<unknown>, modifiers?: IntervalModifiers): HtmlProps => ({
  [`data-on-interval${intervalModifiers(modifiers)}`]: toJs(expression)
})

/** Creates a Datastar `data-on-signal-patch` attribute. @see https://data-star.dev/reference/attributes#data-on-signal-patch */
export const onSignalPatch = (expression: ExprInput<unknown>, modifiers?: TimingModifiers): HtmlProps => {
  const parts: Array<string> = []
  appendTimingModifiers(parts, modifiers ?? {})
  return { [`data-on-signal-patch${modifierSuffix(parts)}`]: toJs(expression) }
}

/** Creates a Datastar `data-on-signal-patch-filter` attribute. @see https://data-star.dev/reference/attributes#data-on-signal-patch-filter */
export const onSignalPatchFilter = (filter: SignalFilter): HtmlProps => ({
  "data-on-signal-patch-filter": toJs(filter)
})

/** Creates a Datastar `data-json-signals` attribute. @see https://data-star.dev/reference/attributes#data-json-signals */
export const jsonSignals = (filter?: SignalFilter, options: JsonSignalsOptions = {}): HtmlProps => ({
  [options.terse === true ? "data-json-signals__terse" : "data-json-signals"]: filter === undefined ? true : toJs(filter)
})

/** Creates a Datastar `data-preserve-attr` attribute. @see https://data-star.dev/reference/attributes#data-preserve-attr */
export const preserveAttr = (...names: ReadonlyArray<string>): HtmlProps => ({
  "data-preserve-attr": names.join(" ")
})

/** Creates a Datastar `data-ignore` attribute. @see https://data-star.dev/reference/attributes#data-ignore */
export const ignore = (options: IgnoreOptions = {}): HtmlProps => ({
  [options.self === true ? "data-ignore__self" : "data-ignore"]: true
})

/** Creates a Datastar `data-ignore-morph` attribute. @see https://data-star.dev/reference/attributes#data-ignore-morph */
export const ignoreMorph = (): HtmlProps => ({
  "data-ignore-morph": true
})

/** Creates a Datastar `data-init` attribute. @see https://data-star.dev/reference/attributes#data-init */
export const init = (expression: ExprInput<unknown>, modifiers?: InitModifiers): HtmlProps => ({
  [`data-init${initModifiers(modifiers)}`]: toJs(expression)
})

/** Creates a Datastar `data-effect` attribute. @see https://data-star.dev/reference/attributes#data-effect */
export const effect = (expression: ExprInput<unknown>): HtmlProps => ({
  "data-effect": toJs(expression)
})

/** Creates a Datastar `data-text` attribute. @see https://data-star.dev/reference/attributes#data-text */
export const text = (expression: ExprInput<unknown>): HtmlProps => ({
  "data-text": toJs(expression)
})

/** Creates a Datastar `data-show` attribute. @see https://data-star.dev/reference/attributes#data-show */
export const show = (expression: ExprInput<unknown>): HtmlProps => ({
  "data-show": toJs(expression)
})

/** Creates a Datastar `data-bind:*` attribute. @see https://data-star.dev/reference/attributes#data-bind */
export const bind = <T, Name extends string>(name: Name | Signal<T, Name>, modifiers: BindModifiers = {}): HtmlProps => {
  const signalName = signalKeyName(name)
  assertUnmodifiedSignalName(signalName, modifiers)
  return { [`data-bind:${signalName}${bindModifiers(modifiers)}`]: true }
}

/** Creates a Datastar `data-ref:*` attribute. @see https://data-star.dev/reference/attributes#data-ref */
export const ref = <Name extends string>(name: Name | Signal<unknown, Name>, modifiers: CaseModifiers = {}): HtmlProps => {
  const signalName = signalKeyName(name)
  assertUnmodifiedSignalName(signalName, modifiers)
  return { [`data-ref:${signalName}${caseModifierSuffix(modifiers)}`]: true }
}

/** Creates a Datastar `data-indicator:*` attribute. @see https://data-star.dev/reference/attributes#data-indicator */
export const indicator = <Name extends string>(name: Name | Signal<boolean, Name>, modifiers: CaseModifiers = {}): HtmlProps => {
  const signalName = signalKeyName(name)
  assertUnmodifiedSignalName(signalName, modifiers)
  return { [`data-indicator:${signalName}${caseModifierSuffix(modifiers)}`]: true }
}

/** Creates a keyed Datastar `data-attr:*` attribute. @see https://data-star.dev/reference/attributes#data-attr */
export const dataAttr = (name: string, expression: ExprInput<unknown>): HtmlProps => ({
  [`data-attr:${name}`]: toJs(expression)
})

/** Creates an object-valued Datastar `data-attr` attribute. @see https://data-star.dev/reference/attributes#data-attr */
export const dataAttrs = (mapping: Readonly<Record<string, ExprInput<unknown>>>): HtmlProps => ({
  "data-attr": toJs(mapping)
})

/** Creates a keyed Datastar `data-class:*` attribute. @see https://data-star.dev/reference/attributes#data-class */
export const dataClass = (name: string, expression: ExprInput<unknown>, modifiers?: CaseModifiers): HtmlProps => ({
  [`data-class:${name}${caseModifierSuffix(modifiers)}`]: toJs(expression)
})

/** Creates an object-valued Datastar `data-class` attribute. @see https://data-star.dev/reference/attributes#data-class */
export const dataClasses = (mapping: Readonly<Record<string, ExprInput<unknown>>>): HtmlProps => ({
  "data-class": toJs(mapping)
})

/** Creates a keyed Datastar `data-computed:*` attribute. @see https://data-star.dev/reference/attributes#data-computed */
export const dataComputed = <T>(name: string, expression: ExprInput<T>, modifiers: CaseModifiers = {}): HtmlProps => {
  assertUnmodifiedSignalName(name, modifiers)
  return { [`data-computed:${name}${caseModifierSuffix(modifiers)}`]: toJs(expression) }
}

/** Creates an object-valued Datastar `data-computed` attribute. @see https://data-star.dev/reference/attributes#data-computed */
export const dataComputeds = (mapping: DataComputedObject): HtmlProps => {
  assertDataComputedObjectKeys(mapping)
  return { "data-computed": toJs(mapping) }
}

/** Creates a keyed Datastar `data-style:*` attribute. @see https://data-star.dev/reference/attributes#data-style */
export const dataStyle = (name: string, expression: ExprInput<unknown>): HtmlProps => ({
  [`data-style:${name}`]: toJs(expression)
})

/** Creates an object-valued Datastar `data-style` attribute. @see https://data-star.dev/reference/attributes#data-style */
export const dataStyles = (mapping: Readonly<Record<string, ExprInput<unknown>>>): HtmlProps => ({
  "data-style": toJs(mapping)
})

/** Creates a keyed Datastar `data-signals:*` attribute. @see https://data-star.dev/reference/attributes#data-signals */
export const dataSignal = (name: string, value: SignalValueInput, modifiers: DataSignalModifiers = {}): HtmlProps => {
  assertUnmodifiedSignalName(name, modifiers)
  return { [`data-signals:${name}${dataSignalModifiers(modifiers)}`]: toJs(value) }
}

/** Creates an object-valued Datastar `data-signals` attribute. @see https://data-star.dev/reference/attributes#data-signals */
export const dataSignals = (values: SignalStateInput, options: DataSignalsOptions = {}): HtmlProps => {
  assertSignalObjectKeys(values)
  return {
    [options.ifMissing === true ? "data-signals__ifmissing" : "data-signals"]: toJs(values)
  }
}
