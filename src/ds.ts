import type { Props } from "./html.js"
import type { ElementNamespace, ElementPatchMode } from "./sse.js"

export interface Expr<T = unknown> {
  toDatastarExpression(): string
}

export type ExprInput<T> = Expr<T> | T

export type DatastarValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Expr<unknown>
  | readonly DatastarValue[]
  | { readonly [key: string]: DatastarValue }
export type DatastarObject = Readonly<Record<string, DatastarValue>>
export type DatastarFunction<T = unknown> = (...args: ReadonlyArray<unknown>) => T

export class SignalNameError extends Error {
  constructor(readonly signalName: string) {
    super(`Invalid Datastar signal name: ${JSON.stringify(signalName)}`)
  }
}

const signalNamePattern = /^_?[A-Za-z][A-Za-z0-9_]*(\._?[A-Za-z][A-Za-z0-9_]*)*$/

const isSignalName = (name: string): boolean => signalNamePattern.test(name)

const assertSignalName = (name: string): void => {
  if (!isSignalName(name)) {
    throw new SignalNameError(name)
  }
}

class RawExpr<T = unknown> implements Expr<T> {
  constructor(private readonly code: string) {}

  toDatastarExpression(): string {
    return this.code
  }

  toString(): string {
    return this.code
  }
}

export class Signal<T, Name extends string = string> implements Expr<T> {
  constructor(readonly name: Name) {
    assertSignalName(name)
  }

  toDatastarExpression(): string {
    return `$${this.name}`
  }

  toString(): string {
    return this.toDatastarExpression()
  }

  path<Key extends keyof NonNullable<T> & string>(key: Key): Signal<NonNullable<T>[Key], `${Name}.${Key}`> {
    return new Signal(`${this.name}.${key}` as `${Name}.${Key}`)
  }
}

export const raw = <T = unknown>(code: string): Expr<T> => new RawExpr<T>(code)

export const signal = <T, Name extends string>(name: Name): Signal<T, Name> => new Signal(name)

type PrivateSignalName<Name extends string> = Name extends `_${string}` ? Name : `_${Name}`

export const local = <T, Name extends string>(name: Name): Signal<T, PrivateSignalName<Name>> =>
  signal<T, PrivateSignalName<Name>>((name.startsWith("_") ? name : `_${name}`) as PrivateSignalName<Name>)

const isExpr = (value: unknown): value is Expr<unknown> =>
  typeof value === "object" && value !== null && "toDatastarExpression" in value

const toJs = (value: ExprInput<unknown>): string => {
  if (isExpr(value)) {
    return value.toDatastarExpression()
  }

  if (value === undefined) {
    return "undefined"
  }

  if (typeof value === "string") {
    return JSON.stringify(value)
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return JSON.stringify(value)
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => toJs(item)).join(", ")}]`
  }

  if (typeof value === "object") {
    return `{${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${toJs(item)}`).join(", ")}}`
  }

  return JSON.stringify(String(value))
}

export interface SignalFilter {
  readonly include?: Expr<RegExp> | string
  readonly exclude?: Expr<RegExp> | string
}

export interface FetchOptions {
  readonly filterSignals?: SignalFilter
  readonly selector?: string | null
  readonly headers?: Readonly<Record<string, string>>
  readonly openWhenHidden?: boolean
  readonly payload?: DatastarObject
  readonly responseOverrides?:
    | {
        readonly selector?: string
        readonly mode?: ElementPatchMode
        readonly namespace?: ElementNamespace
        readonly useViewTransition?: boolean
      }
    | {
        readonly onlyIfMissing?: boolean
      }
  readonly retry?: "auto" | "error" | "always" | "never"
  readonly retryInterval?: number
  readonly retryScaler?: number
  readonly retryMaxWait?: number
  readonly retryMaxCount?: number
  readonly requestCancellation?: "auto" | "cleanup" | "disabled" | Expr<AbortController>
}

export const regex = (pattern: string, flags = ""): Expr<RegExp> => raw(`/${pattern}/${flags}`)

const fetchOptionsToJs = (options: FetchOptions): string => {
  const entries: Array<[string, ExprInput<unknown>]> = []

  if (options.filterSignals !== undefined) entries.push(["filterSignals", options.filterSignals])
  if (options.selector !== undefined) entries.push(["selector", options.selector])
  if (options.headers !== undefined) entries.push(["headers", options.headers])
  if (options.openWhenHidden !== undefined) entries.push(["openWhenHidden", options.openWhenHidden])
  if (options.payload !== undefined) entries.push(["payload", options.payload])
  if (options.responseOverrides !== undefined) entries.push(["responseOverrides", options.responseOverrides])
  if (options.retry !== undefined) entries.push(["retry", options.retry])
  if (options.retryInterval !== undefined) entries.push(["retryInterval", options.retryInterval])
  if (options.retryScaler !== undefined) entries.push(["retryScaler", options.retryScaler])
  if (options.retryMaxWait !== undefined) entries.push(["retryMaxWait", options.retryMaxWait])
  if (options.retryMaxCount !== undefined) entries.push(["retryMaxCount", options.retryMaxCount])
  if (options.requestCancellation !== undefined) entries.push(["requestCancellation", options.requestCancellation])

  return `{${entries.map(([key, value]) => `${key}: ${toJs(value)}`).join(", ")}}`
}

export type UrlInput = string | Expr<string>
export type QueryParamInput = ExprInput<string | number | boolean>

const escapeTemplateText = (value: string): string => value.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("${", "\\${")

export const queryUrl = (path: string, params: Readonly<Record<string, QueryParamInput>>): Expr<string> => {
  const entries = Object.entries(params)
  if (entries.length === 0) {
    return raw(JSON.stringify(path))
  }

  const separator = path.includes("?") ? "&" : "?"
  const query = entries
    .map(([key, value]) => `${encodeURIComponent(key)}=${"${encodeURIComponent("}${toJs(value)}${")}"}`)
    .join("&")
  return raw(`\`${escapeTemplateText(path)}${separator}${query}\``)
}

const urlToJs = (url: UrlInput): string => typeof url === "string" ? JSON.stringify(url) : url.toDatastarExpression()

const fetchAction = (method: "get" | "post" | "put" | "patch" | "delete", url: UrlInput, options?: FetchOptions): Expr<void> => {
  if (options === undefined || Object.keys(options).length === 0) {
    return raw(`@${method}(${urlToJs(url)})`)
  }

  return raw(`@${method}(${urlToJs(url)}, ${fetchOptionsToJs(options)})`)
}

export const get = (url: UrlInput, options?: FetchOptions): Expr<void> => fetchAction("get", url, options)
export const post = (url: UrlInput, options?: FetchOptions): Expr<void> => fetchAction("post", url, options)
export const put = (url: UrlInput, options?: FetchOptions): Expr<void> => fetchAction("put", url, options)
export const patch = (url: UrlInput, options?: FetchOptions): Expr<void> => fetchAction("patch", url, options)
const del = (url: UrlInput, options?: FetchOptions): Expr<void> => fetchAction("delete", url, options)

const datastarAction = <T = unknown>(name: string, ...args: ReadonlyArray<ExprInput<unknown>>): Expr<T> =>
  raw(`@${name}(${args.map((arg) => toJs(arg)).join(", ")})`)

export const peek = <T = unknown>(callback: Expr<DatastarFunction<T>>): Expr<T> => datastarAction<T>("peek", callback)

export const setAll = (value: ExprInput<unknown>, filter?: SignalFilter): Expr<void> =>
  filter === undefined ? datastarAction<void>("setAll", value) : datastarAction<void>("setAll", value, filter)

export const toggleAll = (filter?: SignalFilter): Expr<void> =>
  filter === undefined ? datastarAction<void>("toggleAll") : datastarAction<void>("toggleAll", filter)

export type Duration = number | `${number}ms` | `${number}s`
export type CaseModifier = "camel" | "kebab" | "snake" | "pascal"

export interface DebounceOptions {
  readonly duration: Duration
  readonly leading?: boolean
  readonly noTrailing?: boolean
}

export interface ThrottleOptions {
  readonly duration: Duration
  readonly noLeading?: boolean
  readonly trailing?: boolean
}

interface TimingModifiers {
  readonly delay?: Duration
  readonly debounce?: Duration | DebounceOptions
  readonly throttle?: Duration | ThrottleOptions
  readonly viewTransition?: boolean
}

export interface OnModifiers extends TimingModifiers {
  readonly once?: boolean
  readonly passive?: boolean
  readonly capture?: boolean
  readonly case?: CaseModifier
  readonly window?: boolean
  readonly document?: boolean
  readonly outside?: boolean
  readonly prevent?: boolean
  readonly stop?: boolean
}

export interface IntersectModifiers extends TimingModifiers {
  readonly once?: boolean
  readonly exit?: boolean
  readonly half?: boolean
  readonly full?: boolean
  readonly threshold?: number
}

export interface IntervalModifiers {
  readonly duration?: Duration
  readonly leading?: boolean
  readonly viewTransition?: boolean
}

export interface InitModifiers {
  readonly delay?: Duration
  readonly viewTransition?: boolean
}

interface CaseModifierOptions {
  readonly case?: CaseModifier
}

export interface BindModifiers extends CaseModifierOptions {
  readonly prop?: string
  readonly events?: string | ReadonlyArray<string>
}

export interface DataSignalModifiers extends CaseModifierOptions {
  readonly ifMissing?: boolean
}

const durationModifier = (duration: Duration): string => typeof duration === "number" ? `${duration}ms` : duration

const appendTimingModifiers = (parts: Array<string>, modifiers: TimingModifiers): void => {
  if (modifiers.delay !== undefined) parts.push(`delay.${durationModifier(modifiers.delay)}`)

  if (modifiers.debounce !== undefined) {
    if (typeof modifiers.debounce === "object") {
      const tags = [durationModifier(modifiers.debounce.duration)]
      if (modifiers.debounce.leading === true) tags.push("leading")
      if (modifiers.debounce.noTrailing === true) tags.push("notrailing")
      parts.push(`debounce.${tags.join(".")}`)
    } else {
      parts.push(`debounce.${durationModifier(modifiers.debounce)}`)
    }
  }

  if (modifiers.throttle !== undefined) {
    if (typeof modifiers.throttle === "object") {
      const tags = [durationModifier(modifiers.throttle.duration)]
      if (modifiers.throttle.noLeading === true) tags.push("noleading")
      if (modifiers.throttle.trailing === true) tags.push("trailing")
      parts.push(`throttle.${tags.join(".")}`)
    } else {
      parts.push(`throttle.${durationModifier(modifiers.throttle)}`)
    }
  }

  if (modifiers.viewTransition === true) parts.push("viewtransition")
}

const modifierSuffix = (parts: ReadonlyArray<string>): string => parts.length === 0 ? "" : `__${parts.join("__")}`

const caseModifierSuffix = (modifiers: CaseModifierOptions = {}): string =>
  modifiers.case === undefined ? "" : `__case.${modifiers.case}`

const assertUnmodifiedSignalName = (name: string, modifiers: CaseModifierOptions): void => {
  if (modifiers.case === undefined) {
    assertSignalName(name)
  }
}

const signalKeyName = <Name extends string>(name: Name | { readonly name: Name }): Name =>
  typeof name === "string" ? name : name.name

const initModifiers = (modifiers: InitModifiers = {}): string => {
  const parts: Array<string> = []
  if (modifiers.delay !== undefined) parts.push(`delay.${durationModifier(modifiers.delay)}`)
  if (modifiers.viewTransition === true) parts.push("viewtransition")
  return modifierSuffix(parts)
}

const bindModifiers = (modifiers: BindModifiers = {}): string => {
  const parts: Array<string> = []
  if (modifiers.case !== undefined) parts.push(`case.${modifiers.case}`)
  if (modifiers.prop !== undefined) parts.push(`prop.${modifiers.prop}`)
  if (modifiers.events !== undefined) {
    const events = typeof modifiers.events === "string" ? [modifiers.events] : modifiers.events
    if (events.length > 0) parts.push(`event.${events.join(".")}`)
  }
  return modifierSuffix(parts)
}

const dataSignalModifiers = (modifiers: DataSignalModifiers = {}): string => {
  const parts = modifiers.case === undefined ? [] : [`case.${modifiers.case}`]
  if (modifiers.ifMissing === true) parts.push("ifmissing")
  return modifierSuffix(parts)
}

const onModifiers = (modifiers: OnModifiers = {}): string => {
  const parts: Array<string> = []
  if (modifiers.once === true) parts.push("once")
  if (modifiers.passive === true) parts.push("passive")
  if (modifiers.capture === true) parts.push("capture")
  if (modifiers.case !== undefined) parts.push(`case.${modifiers.case}`)
  if (modifiers.window === true) parts.push("window")
  if (modifiers.document === true) parts.push("document")
  if (modifiers.outside === true) parts.push("outside")
  if (modifiers.prevent === true) parts.push("prevent")
  if (modifiers.stop === true) parts.push("stop")
  appendTimingModifiers(parts, modifiers)
  return modifierSuffix(parts)
}

const intersectModifiers = (modifiers: IntersectModifiers = {}): string => {
  const parts: Array<string> = []
  if (modifiers.once === true) parts.push("once")
  if (modifiers.exit === true) parts.push("exit")
  if (modifiers.half === true) parts.push("half")
  if (modifiers.full === true) parts.push("full")
  if (modifiers.threshold !== undefined) parts.push(`threshold.${modifiers.threshold}`)
  appendTimingModifiers(parts, modifiers)
  return modifierSuffix(parts)
}

const intervalModifiers = (modifiers: IntervalModifiers = {}): string => {
  const parts: Array<string> = []
  if (modifiers.duration !== undefined || modifiers.leading === true) {
    const tags = [durationModifier(modifiers.duration ?? "1s")]
    if (modifiers.leading === true) tags.push("leading")
    parts.push(`duration.${tags.join(".")}`)
  }
  if (modifiers.viewTransition === true) parts.push("viewtransition")
  return modifierSuffix(parts)
}

export const on = (event: string, expression: ExprInput<unknown>, modifiers?: OnModifiers): Props => ({
  [`data-on:${event}${onModifiers(modifiers)}`]: toJs(expression)
})

export const onIntersect = (expression: ExprInput<unknown>, modifiers?: IntersectModifiers): Props => ({
  [`data-on-intersect${intersectModifiers(modifiers)}`]: toJs(expression)
})

export const onInterval = (expression: ExprInput<unknown>, modifiers?: IntervalModifiers): Props => ({
  [`data-on-interval${intervalModifiers(modifiers)}`]: toJs(expression)
})

export const onSignalPatch = (expression: ExprInput<unknown>, modifiers?: TimingModifiers): Props => {
  const parts: Array<string> = []
  appendTimingModifiers(parts, modifiers ?? {})
  return { [`data-on-signal-patch${modifierSuffix(parts)}`]: toJs(expression) }
}

export const onSignalPatchFilter = (filter: SignalFilter): Props => ({
  "data-on-signal-patch-filter": toJs(filter)
})

export const jsonSignals = (filter?: SignalFilter, options: { readonly terse?: boolean } = {}): Props => ({
  [options.terse === true ? "data-json-signals__terse" : "data-json-signals"]: filter === undefined ? true : toJs(filter)
})

export const preserveAttr = (...names: ReadonlyArray<string>): Props => ({
  "data-preserve-attr": names.join(" ")
})

export const ignore = (options: { readonly self?: boolean } = {}): Props => ({
  [options.self === true ? "data-ignore__self" : "data-ignore"]: true
})

export const ignoreMorph = (): Props => ({
  "data-ignore-morph": true
})

export const init = (expression: ExprInput<unknown>, modifiers?: InitModifiers): Props => ({
  [`data-init${initModifiers(modifiers)}`]: toJs(expression)
})

export const effect = (expression: ExprInput<unknown>): Props => ({
  "data-effect": toJs(expression)
})

export const text = (expression: ExprInput<unknown>): Props => ({
  "data-text": toJs(expression)
})

export const show = (expression: ExprInput<unknown>): Props => ({
  "data-show": toJs(expression)
})

export const bind = <T, Name extends string>(name: Name | Signal<T, Name>, modifiers: BindModifiers = {}): Props => {
  const signalName = signalKeyName(name)
  assertUnmodifiedSignalName(signalName, modifiers)
  return { [`data-bind:${signalName}${bindModifiers(modifiers)}`]: true }
}

export const ref = <Name extends string>(name: Name | Signal<unknown, Name>, modifiers: CaseModifierOptions = {}): Props => {
  const signalName = signalKeyName(name)
  assertUnmodifiedSignalName(signalName, modifiers)
  return { [`data-ref:${signalName}${caseModifierSuffix(modifiers)}`]: true }
}

export const indicator = <Name extends string>(name: Name | Signal<boolean, Name>, modifiers: CaseModifierOptions = {}): Props => {
  const signalName = signalKeyName(name)
  assertUnmodifiedSignalName(signalName, modifiers)
  return { [`data-indicator:${signalName}${caseModifierSuffix(modifiers)}`]: true }
}

export const dataAttr = (name: string, expression: ExprInput<unknown>): Props => ({
  [`data-attr:${name}`]: toJs(expression)
})

export const dataAttrs = (mapping: Readonly<Record<string, ExprInput<unknown>>>): Props => ({
  "data-attr": toJs(mapping)
})

export const dataClass = (name: string, expression: ExprInput<unknown>, modifiers?: CaseModifierOptions): Props => ({
  [`data-class:${name}${caseModifierSuffix(modifiers)}`]: toJs(expression)
})

export const dataClasses = (mapping: Readonly<Record<string, ExprInput<unknown>>>): Props => ({
  "data-class": toJs(mapping)
})

export const dataComputed = <T>(name: string, expression: ExprInput<T>, modifiers: CaseModifierOptions = {}): Props => {
  assertUnmodifiedSignalName(name, modifiers)
  return { [`data-computed:${name}${caseModifierSuffix(modifiers)}`]: toJs(expression) }
}

export type DataComputedValue = Expr<DatastarFunction<unknown>> | { readonly [key: string]: DataComputedValue }
export type DataComputedObject = Readonly<Record<string, DataComputedValue>>

const assertDataComputedObjectKeys = (values: DataComputedObject): void => {
  for (const [key, value] of Object.entries(values)) {
    assertSignalName(key)

    if (!isExpr(value)) {
      assertDataComputedObjectKeys(value)
    }
  }
}

export const dataComputeds = (mapping: DataComputedObject): Props => {
  assertDataComputedObjectKeys(mapping)
  return { "data-computed": toJs(mapping) }
}

export const dataStyle = (name: string, expression: ExprInput<unknown>): Props => ({
  [`data-style:${name}`]: toJs(expression)
})

export const dataStyles = (mapping: Readonly<Record<string, ExprInput<unknown>>>): Props => ({
  "data-style": toJs(mapping)
})

const assertSignalObjectKeys = (values: DatastarObject): void => {
  for (const [key, value] of Object.entries(values)) {
    assertSignalName(key)

    if (typeof value === "object" && value !== null && !Array.isArray(value) && !isExpr(value)) {
      assertSignalObjectKeys(value as DatastarObject)
    }
  }
}

export const dataSignal = (name: string, value: DatastarValue, modifiers: DataSignalModifiers = {}): Props => {
  assertUnmodifiedSignalName(name, modifiers)
  return { [`data-signals:${name}${dataSignalModifiers(modifiers)}`]: toJs(value) }
}

export const dataSignals = (values: DatastarObject, options: { readonly ifMissing?: boolean } = {}): Props => {
  assertSignalObjectKeys(values)
  return {
    [options.ifMissing === true ? "data-signals__ifmissing" : "data-signals"]: toJs(values)
  }
}

export { del as delete }
