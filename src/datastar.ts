import type { Attributes } from "./html.js"

export interface Expr<T = unknown> {
  readonly _tag: "Expr"
  toDatastarExpression(): string
}

export type ExprInput<T> = Expr<T> | T

type Jsonish = string | number | boolean | null | readonly Jsonish[] | { readonly [key: string]: Jsonish | Expr<unknown> }

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

  constructor(readonly name: Name) {}

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

export const fetchAction = (method: HttpMethod, url: string, options?: FetchOptions): Expr<void> => {
  if (options === undefined || Object.keys(options).length === 0) {
    return raw(`@${method}(${JSON.stringify(url)})`)
  }

  return raw(`@${method}(${JSON.stringify(url)}, ${fetchOptionsToJs(options)})`)
}

export const get = (url: string, options?: FetchOptions): Expr<void> => fetchAction("get", url, options)
export const post = (url: string, options?: FetchOptions): Expr<void> => fetchAction("post", url, options)
export const put = (url: string, options?: FetchOptions): Expr<void> => fetchAction("put", url, options)
export const patch = (url: string, options?: FetchOptions): Expr<void> => fetchAction("patch", url, options)
export const del = (url: string, options?: FetchOptions): Expr<void> => fetchAction("delete", url, options)

export const mergeAttrs = (...attrs: ReadonlyArray<Attributes>): Attributes => Object.assign({}, ...attrs)

export const on = (event: string, expression: ExprInput<unknown>): Attributes => ({
  [`data-on:${event}`]: toJs(expression)
})

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

export const dataClass = (name: string, expression: ExprInput<unknown>): Attributes => ({
  [`data-class:${name}`]: toJs(expression)
})

export const dataSignals = (values: Readonly<Record<string, Jsonish>>, options: { readonly ifMissing?: boolean } = {}): Attributes => ({
  [options.ifMissing === true ? "data-signals__ifmissing" : "data-signals"]: toJs(values)
})
