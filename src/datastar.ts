import type { Attributes } from "./html.js"

export interface Expr<T = unknown> {
  readonly _tag: "Expr"
  toDatastarExpression(): string
}

export type ExprInput<T> = Expr<T> | T

type Jsonish = string | number | boolean | null | readonly Jsonish[] | { readonly [key: string]: Jsonish | Expr<unknown> }

export class SignalNameError extends Error {
  readonly _tag = "SignalNameError"

  constructor(readonly signalName: string) {
    super(`Invalid Datastar signal name: ${JSON.stringify(signalName)}`)
  }
}

const signalSegmentPattern = /^_?[A-Za-z][A-Za-z0-9_]*$/

export const isSignalName = (name: string): boolean =>
  name.length > 0 && name.split(".").every((segment) => signalSegmentPattern.test(segment))

export const assertSignalName = (name: string): void => {
  if (!isSignalName(name)) {
    throw new SignalNameError(name)
  }
}

class RawExpr<T = unknown> implements Expr<T> {
  readonly _tag = "Expr"

  constructor(private readonly code: string) {}

  toDatastarExpression(): string {
    return this.code
  }

  toString(): string {
    return this.code
  }
}

export class Signal<T, Name extends string = string> implements Expr<T> {
  readonly _tag = "Expr"

  constructor(readonly name: Name) {
    assertSignalName(name)
  }

  toDatastarExpression(): string {
    return `$${this.name}`
  }

  toString(): string {
    return this.toDatastarExpression()
  }

  set(value: ExprInput<T>): Expr<void> {
    return raw(`(${this.toDatastarExpression()} = ${toJs(value)})`)
  }

  eq(value: ExprInput<T>): Expr<boolean> {
    return raw(`(${this.toDatastarExpression()} === ${toJs(value)})`)
  }

  neq(value: ExprInput<T>): Expr<boolean> {
    return raw(`(${this.toDatastarExpression()} !== ${toJs(value)})`)
  }

  add(this: Signal<number, Name>, amount: ExprInput<number>): Expr<void> {
    return amount === 1 ? raw(`${this.toDatastarExpression()}++`) : raw(`(${this.toDatastarExpression()} = ${this.toDatastarExpression()} + ${toJs(amount)})`)
  }

  toggle(this: Signal<boolean, Name>): Expr<void> {
    return raw(`(${this.toDatastarExpression()} = !${this.toDatastarExpression()})`)
  }

  path<Key extends keyof NonNullable<T> & string>(key: Key): Signal<NonNullable<T>[Key], `${Name}.${Key}`> {
    return new Signal(`${this.name}.${key}` as `${Name}.${Key}`)
  }
}

export type SignalRecord<Shape extends object> = {
  readonly [Key in keyof Shape & string]: Signal<Shape[Key], Key>
}

export const raw = <T = unknown>(code: string): Expr<T> => new RawExpr<T>(code)

export const signal = <T, Name extends string>(name: Name): Signal<T, Name> => new Signal(name)

export const signals = <Shape extends object>(): SignalRecord<Shape> =>
  new Proxy(
    {},
    {
      get: (_target, property) => {
        if (typeof property !== "string") {
          return undefined
        }
        return new Signal(property)
      }
    }
  ) as SignalRecord<Shape>

export const toExpression = (value: ExprInput<unknown>): string => toJs(value)

const isExpr = (value: unknown): value is Expr<unknown> =>
  typeof value === "object" && value !== null && "toDatastarExpression" in value

export const toJs = (value: ExprInput<unknown>): string => {
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

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete"
export type ContentType = "json" | "form"
export type RetryMode = "auto" | "error" | "always" | "never"
export type RequestCancellation = "auto" | "cleanup" | "disabled" | Expr<AbortController>

export interface SignalFilter {
  readonly include?: Expr<RegExp>
  readonly exclude?: Expr<RegExp>
}

export interface FetchOptions {
  readonly contentType?: ContentType
  readonly filterSignals?: SignalFilter
  readonly selector?: string
  readonly headers?: Readonly<Record<string, string>>
  readonly openWhenHidden?: boolean
  readonly payload?: Readonly<Record<string, Jsonish | Expr<unknown>>>
  readonly retry?: RetryMode
  readonly retryInterval?: number
  readonly retryScaler?: number
  readonly retryMaxWait?: number
  readonly retryMaxCount?: number
  readonly requestCancellation?: RequestCancellation
}

export const regex = (pattern: string, flags = ""): Expr<RegExp> => raw(`/${pattern}/${flags}`)

export const not = (expression: ExprInput<unknown>): Expr<boolean> => raw(`!(${toJs(expression)})`)

export const and = (...expressions: ReadonlyArray<ExprInput<unknown>>): Expr<boolean> =>
  expressions.length === 0 ? raw("true") : raw(expressions.map((expression) => `(${toJs(expression)})`).join(" && "))

export const or = (...expressions: ReadonlyArray<ExprInput<unknown>>): Expr<boolean> =>
  expressions.length === 0 ? raw("false") : raw(expressions.map((expression) => `(${toJs(expression)})`).join(" || "))

export const ternary = <T>(
  condition: ExprInput<unknown>,
  whenTrue: ExprInput<T>,
  whenFalse: ExprInput<T>
): Expr<T> => raw(`(${toJs(condition)} ? ${toJs(whenTrue)} : ${toJs(whenFalse)})`)

const fetchOptionsToJs = (options: FetchOptions): string => {
  const entries: Array<[string, ExprInput<unknown>]> = []

  if (options.contentType !== undefined) entries.push(["contentType", options.contentType])
  if (options.filterSignals !== undefined) entries.push(["filterSignals", options.filterSignals])
  if (options.selector !== undefined) entries.push(["selector", options.selector])
  if (options.headers !== undefined) entries.push(["headers", options.headers])
  if (options.openWhenHidden !== undefined) entries.push(["openWhenHidden", options.openWhenHidden])
  if (options.payload !== undefined) entries.push(["payload", options.payload])
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

export const fetchAction = (method: HttpMethod, url: UrlInput, options?: FetchOptions): Expr<void> => {
  if (options === undefined || Object.keys(options).length === 0) {
    return raw(`@${method}(${urlToJs(url)})`)
  }

  return raw(`@${method}(${urlToJs(url)}, ${fetchOptionsToJs(options)})`)
}

export const get = (url: UrlInput, options?: FetchOptions): Expr<void> => fetchAction("get", url, options)
export const post = (url: UrlInput, options?: FetchOptions): Expr<void> => fetchAction("post", url, options)
export const put = (url: UrlInput, options?: FetchOptions): Expr<void> => fetchAction("put", url, options)
export const patch = (url: UrlInput, options?: FetchOptions): Expr<void> => fetchAction("patch", url, options)
export const del = (url: UrlInput, options?: FetchOptions): Expr<void> => fetchAction("delete", url, options)

export class AttributeConflictError extends Error {
  readonly _tag = "AttributeConflictError"

  constructor(readonly attribute: string) {
    super(`Duplicate HTML attribute: ${attribute}`)
  }
}

export const mergeAttrs = (...attrs: ReadonlyArray<Attributes>): Attributes => Object.assign({}, ...attrs)

export const mergeAttrsStrict = (...attrs: ReadonlyArray<Attributes>): Attributes => {
  const merged: Record<string, Attributes[string]> = {}

  for (const group of attrs) {
    for (const [key, value] of Object.entries(group)) {
      if (key in merged) {
        throw new AttributeConflictError(key)
      }
      merged[key] = value
    }
  }

  return merged
}

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

export interface TimingModifiers {
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

export const onModifiers = (modifiers: OnModifiers = {}): string => {
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

export const intersectModifiers = (modifiers: IntersectModifiers = {}): string => {
  const parts: Array<string> = []
  if (modifiers.once === true) parts.push("once")
  if (modifiers.exit === true) parts.push("exit")
  if (modifiers.half === true) parts.push("half")
  if (modifiers.full === true) parts.push("full")
  if (modifiers.threshold !== undefined) parts.push(`threshold.${modifiers.threshold}`)
  appendTimingModifiers(parts, modifiers)
  return modifierSuffix(parts)
}

export const intervalModifiers = (modifiers: IntervalModifiers = {}): string => {
  const parts: Array<string> = []
  if (modifiers.duration !== undefined || modifiers.leading === true) {
    const tags = [durationModifier(modifiers.duration ?? "1s")]
    if (modifiers.leading === true) tags.push("leading")
    parts.push(`duration.${tags.join(".")}`)
  }
  if (modifiers.viewTransition === true) parts.push("viewtransition")
  return modifierSuffix(parts)
}

export const on = (event: string, expression: ExprInput<unknown>, modifiers?: OnModifiers): Attributes => ({
  [`data-on:${event}${onModifiers(modifiers)}`]: toJs(expression)
})

export const onIntersect = (expression: ExprInput<unknown>, modifiers?: IntersectModifiers): Attributes => ({
  [`data-on-intersect${intersectModifiers(modifiers)}`]: toJs(expression)
})

export const onInterval = (expression: ExprInput<unknown>, modifiers?: IntervalModifiers): Attributes => ({
  [`data-on-interval${intervalModifiers(modifiers)}`]: toJs(expression)
})

export const onSignalPatch = (expression: ExprInput<unknown>, modifiers?: TimingModifiers): Attributes => {
  const parts: Array<string> = []
  appendTimingModifiers(parts, modifiers ?? {})
  return { [`data-on-signal-patch${modifierSuffix(parts)}`]: toJs(expression) }
}

export const init = (expression: ExprInput<unknown>): Attributes => ({
  "data-init": toJs(expression)
})

export const text = (expression: ExprInput<unknown>): Attributes => ({
  "data-text": toJs(expression)
})

export const show = (expression: ExprInput<unknown>): Attributes => ({
  "data-show": toJs(expression)
})

export const bind = <T, Name extends string>(signal: Signal<T, Name>): Attributes => ({
  [`data-bind:${signal.name}`]: true
})

export const indicator = <Name extends string>(name: Name | Signal<boolean, Name>): Attributes => {
  const signalName = typeof name === "string" ? name : name.name
  return { [`data-indicator:${signalName}`]: true }
}

export const dataAttr = (name: string, expression: ExprInput<unknown>): Attributes => ({
  [`data-attr:${name}`]: toJs(expression)
})

export const dataAttrs = (mapping: Readonly<Record<string, ExprInput<unknown>>>): Attributes => ({
  "data-attr": toJs(mapping)
})

export const dataClass = (name: string, expression: ExprInput<unknown>): Attributes => ({
  [`data-class:${name}`]: toJs(expression)
})

export const dataClasses = (mapping: Readonly<Record<string, ExprInput<unknown>>>): Attributes => ({
  "data-class": toJs(mapping)
})

export const dataStyle = (name: string, expression: ExprInput<unknown>): Attributes => ({
  [`data-style:${name}`]: toJs(expression)
})

export const dataStyles = (mapping: Readonly<Record<string, ExprInput<unknown>>>): Attributes => ({
  "data-style": toJs(mapping)
})

const assertSignalObjectKeys = (values: Readonly<Record<string, Jsonish | Expr<unknown>>>): void => {
  for (const [key, value] of Object.entries(values)) {
    assertSignalName(key)

    if (typeof value === "object" && value !== null && !Array.isArray(value) && !isExpr(value)) {
      assertSignalObjectKeys(value as Readonly<Record<string, Jsonish | Expr<unknown>>>)
    }
  }
}

export const dataSignals = (values: Readonly<Record<string, Jsonish>>, options: { readonly ifMissing?: boolean } = {}): Attributes => {
  assertSignalObjectKeys(values)
  return {
    [options.ifMissing === true ? "data-signals__ifmissing" : "data-signals"]: toJs(values)
  }
}
