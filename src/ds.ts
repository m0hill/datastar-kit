import type { HtmlProps } from "./html.js"
import type { PatchElementsMode, PatchElementsNamespace } from "./sse.js"
import type { SignalState, SignalValue } from "./types.js"

export type { SignalState, SignalValue } from "./types.js"

/**
 * A value that can render itself as Datastar expression source.
 *
 * @typeParam T The JavaScript value produced when Datastar evaluates the expression.
 */
export interface Expr<T = unknown> {
  /**
   * Serializes this value into Datastar expression source.
   *
   * @returns Datastar expression source code.
   */
  toDatastarExpression(): string
}

/**
 * Either a Datastar expression or a literal value accepted where that expression is expected.
 *
 * @typeParam T Literal value type accepted by the expression site.
 */
export type ExprInput<T> = Expr<T> | T

/**
 * Authoring-time signal value accepted by `ds.*` helpers.
 *
 * @remarks
 * This type can contain `Expr` values because it is rendered into Datastar client-side expression
 * source. Use `SignalValue` for strict runtime signal data that crosses the protocol boundary.
 */
export type SignalValueInput =
  | SignalValue
  | undefined
  | Expr<unknown>
  | readonly SignalValueInput[]
  | { readonly [key: string]: SignalValueInput }

/**
 * Authoring-time signal object accepted by `ds.dataSignals()` and fetch action payload overrides.
 */
export type SignalStateInput = Readonly<Record<string, SignalValueInput>>

/**
 * A callable value represented inside a Datastar expression.
 *
 * @typeParam T Return value produced by the function.
 */
export type DatastarFunction<T = unknown> = (...args: ReadonlyArray<unknown>) => T

/**
 * Error thrown when a signal name cannot be represented by Datastar Kit helpers.
 */
export class SignalNameError extends Error {
  /**
   * @param signalName The invalid signal name.
   */
  constructor(readonly signalName: string) {
    super(`Invalid Datastar signal name: ${JSON.stringify(signalName)}`)
  }
}

/**
 * Datastar signal names are dotted identifiers, optionally prefixed with `_` per segment.
 */
const signalNamePattern = /^_?[A-Za-z][A-Za-z0-9_]*(\._?[A-Za-z][A-Za-z0-9_]*)*$/

/**
 * Keeps signal-name checks centralized so helpers agree on valid generated attributes.
 */
const isSignalName = (name: string): boolean => signalNamePattern.test(name)

/**
 * Fails early on signal names Datastar Kit cannot safely place into keyed attributes.
 */
const assertSignalName = (name: string): void => {
  if (!isSignalName(name)) {
    throw new SignalNameError(name)
  }
}

/**
 * Internal expression wrapper for trusted Datastar expression source.
 */
class RawExpr<T = unknown> implements Expr<T> {
  /**
   * @param code Datastar expression source.
   */
  constructor(private readonly code: string) {}

  /** @returns Datastar expression source code. */
  toDatastarExpression(): string {
    return this.code
  }

  /** @returns Datastar expression source code. */
  toString(): string {
    return this.code
  }
}

/**
 * A typed reference to a Datastar signal.
 *
 * @typeParam T Runtime value stored at this signal path.
 * @typeParam Name Signal path represented by this reference.
 */
export class Signal<T, Name extends string = string> implements Expr<T> {
  /**
   * @param name Datastar signal path.
   * @throws {@link SignalNameError} When the signal name is invalid.
   */
  constructor(readonly name: Name) {
    assertSignalName(name)
  }

  /** @returns The Datastar `$signal` expression for this signal. */
  toDatastarExpression(): string {
    return `$${this.name}`
  }

  /** @returns The Datastar `$signal` expression for this signal. */
  toString(): string {
    return this.toDatastarExpression()
  }

  /**
   * Creates a typed child signal reference below this signal path.
   *
   * @typeParam Key Object key appended to this signal path.
   * @param key Child key to append.
   * @returns A signal reference for the child path.
   * @throws {@link SignalNameError} When the resulting signal name is invalid.
   */
  path<Key extends keyof NonNullable<T> & string>(key: Key): Signal<NonNullable<T>[Key], `${Name}.${Key}`> {
    return new Signal(`${this.name}.${key}` as `${Name}.${Key}`)
  }
}

/**
 * Wraps trusted Datastar expression source without additional escaping.
 */
const raw = <T = unknown>(code: string): Expr<T> => new RawExpr<T>(code)

/**
 * Creates a typed Datastar signal reference.
 *
 * @typeParam T Runtime value stored at this signal path.
 * @typeParam Name Signal path represented by this reference.
 * @param name Datastar signal path.
 * @returns A typed signal reference.
 * @throws {@link SignalNameError} When the signal name is invalid.
 */
export const signal = <T = unknown, Name extends string = string>(name: Name): Signal<T, Name> => new Signal(name)

/**
 * Creates an underscore-prefixed Datastar signal reference.
 *
 * @remarks
 * Datastar does not include underscore-prefixed signals in backend requests by default. This helper
 * is named `local` for UI-local signal state; it is unrelated to browser `localStorage`.
 *
 * @typeParam T Runtime value stored at this signal path.
 * @typeParam Name Signal path before the leading underscore is applied.
 * @param name Signal path to mark as local/private.
 * @returns A signal reference whose path starts with `_`.
 * @throws {@link SignalNameError} When the signal name is invalid.
 * @see https://data-star.dev/reference/attributes#data-signals
 */
export const local = <T = unknown, Name extends string = string>(
  name: Name
): Signal<T, Name extends `_${string}` ? Name : `_${Name}`> =>
  signal<T, Name extends `_${string}` ? Name : `_${Name}`>((name.startsWith("_") ? name : `_${name}`) as Name extends `_${string}` ? Name : `_${Name}`)

/**
 * Detects expression-like objects by capability instead of by class identity.
 */
const isExpr = (value: unknown): value is Expr<unknown> =>
  typeof value === "object" && value !== null && "toDatastarExpression" in value

/**
 * Serializes literals and expressions into Datastar expression source.
 */
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

/**
 * Wraps raw Datastar expression source.
 *
 * @typeParam T JavaScript value produced when Datastar evaluates the expression.
 * @param code Datastar expression source.
 * @returns A typed Datastar expression.
 */
export function expr<T = unknown>(code: string): Expr<T>

/**
 * Builds Datastar expression source from a template with safely serialized interpolations.
 *
 * @typeParam T JavaScript value produced when Datastar evaluates the expression.
 * @param parts Template literal string parts.
 * @param values Values interpolated as Datastar expression source or JavaScript literals.
 * @returns A typed Datastar expression.
 */
export function expr<T = unknown>(parts: TemplateStringsArray, ...values: ReadonlyArray<ExprInput<unknown>>): Expr<T>

export function expr<T = unknown>(
  codeOrParts: string | TemplateStringsArray,
  ...values: ReadonlyArray<ExprInput<unknown>>
): Expr<T> {
  if (typeof codeOrParts === "string") {
    return raw<T>(codeOrParts)
  }

  let code = codeOrParts[0] ?? ""
  for (const [index, value] of values.entries()) {
    code += `${toJs(value)}${codeOrParts[index + 1] ?? ""}`
  }
  return raw<T>(code)
}

/**
 * Datastar signal filter used by signal display, signal patch, and fetch action helpers.
 */
export interface SignalFilter {
  /** Regular expression or expression selecting signal paths to include. */
  readonly include?: Expr<RegExp> | string
  /** Regular expression or expression selecting signal paths to exclude. */
  readonly exclude?: Expr<RegExp> | string
}

/**
 * Overrides Datastar direct-response handling for a fetch action.
 */
export interface FetchActionResponseOverrides {
  /** CSS selector used when the response is handled as an element patch. */
  readonly selector?: string
  /** Patch mode used when merging elements into the DOM. */
  readonly mergeMode?: PatchElementsMode
  /** Markup namespace used to parse returned markup. */
  readonly elementNamespace?: PatchElementsNamespace
  /** Whether to wrap the DOM update in a native browser View Transition. */
  readonly useViewTransition?: boolean
  /** Whether missing signal keys only should be patched. */
  readonly onlyIfMissing?: boolean
}

/**
 * Options accepted by Datastar fetch actions such as `@get()` and `@post()`.
 *
 * @see https://data-star.dev/reference/actions#get
 */
export interface FetchActionOptions {
  /** CSS selector for a form when `contentType` is `"form"`; `null` uses the closest form. */
  readonly selector?: string | null
  /** Headers sent with the fetch request. */
  readonly headers?: Readonly<Record<string, string>>
  /** Request encoding used by Datastar. @defaultValue `"json"` */
  readonly contentType?: "json" | "form"
  /** Signals included in JSON requests. */
  readonly filterSignals?: SignalFilter
  /** Whether `GET` streams stay open while the page is hidden. */
  readonly openWhenHidden?: boolean
  /** Explicit JSON signal payload sent instead of Datastar's filtered signal state. */
  readonly payload?: SignalStateInput
  /** Overrides direct-response headers observed by Datastar's fetch action. */
  readonly responseOverrides?: FetchActionResponseOverrides
  /** Retry policy for failed requests. @defaultValue `"auto"` */
  readonly retry?: "auto" | "error" | "always" | "never"
  /** Initial retry interval in milliseconds. @defaultValue `1000` */
  readonly retryInterval?: number
  /** Multiplier applied to retry wait times. @defaultValue `2` */
  readonly retryScaler?: number
  /** Maximum wait between retries in milliseconds. @defaultValue `30000` */
  readonly retryMaxWait?: number
  /** Maximum retry attempt count. @defaultValue `10` */
  readonly retryMaxCount?: number
  /** Request cancellation behavior or a custom abort controller expression. @defaultValue `"auto"` */
  readonly requestCancellation?: "auto" | "cleanup" | "disabled" | Expr<AbortController>
}

/**
 * Creates a regular-expression literal for Datastar expression options.
 *
 * @param pattern Regular expression pattern.
 * @param flags Regular expression flags.
 * @returns A Datastar expression that evaluates to a `RegExp`.
 */
export const regex = (pattern: string, flags = ""): Expr<RegExp> => raw(`/${pattern}/${flags}`)

/**
 * Keeps fetch action option serialization ordered and limited to supported Datastar keys.
 */
const fetchOptionKeys = [
  "selector",
  "headers",
  "contentType",
  "filterSignals",
  "openWhenHidden",
  "payload",
  "responseOverrides",
  "retry",
  "retryInterval",
  "retryScaler",
  "retryMaxWait",
  "retryMaxCount",
  "requestCancellation"
] as const

/**
 * Serializes fetch action options into a Datastar expression object literal.
 */
const fetchResponseOverridesToJs = (overrides: FetchActionResponseOverrides): string => {
  const entries: string[] = []

  if (overrides.selector !== undefined) entries.push(`selector: ${toJs(overrides.selector)}`)
  if (overrides.mergeMode !== undefined) entries.push(`mode: ${toJs(overrides.mergeMode)}`)
  if (overrides.elementNamespace !== undefined) entries.push(`namespace: ${toJs(overrides.elementNamespace)}`)
  if (overrides.useViewTransition !== undefined) entries.push(`useViewTransition: ${toJs(overrides.useViewTransition)}`)
  if (overrides.onlyIfMissing !== undefined) entries.push(`onlyIfMissing: ${toJs(overrides.onlyIfMissing)}`)

  return `{${entries.join(", ")}}`
}

const fetchOptionsToJs = (options: FetchActionOptions): string => {
  const entries: string[] = []

  for (const key of fetchOptionKeys) {
    if (key === "responseOverrides") {
      const value = options.responseOverrides
      if (value !== undefined) entries.push(`${key}: ${fetchResponseOverridesToJs(value)}`)
      continue
    }

    const value = options[key]
    if (value !== undefined) entries.push(`${key}: ${toJs(value)}`)
  }

  return `{${entries.join(", ")}}`
}

/**
 * Escapes user-supplied URL text before embedding it in a JavaScript template literal.
 */
const escapeTemplateText = (value: string): string => value.replaceAll("\\", "\\\\").replaceAll("`", "\\`").replaceAll("${", "\\${")

/**
 * Builds a Datastar expression for a URL with reactive query parameters.
 *
 * @param path Base path or URL.
 * @param params Query parameter expressions or literal values.
 * @returns A Datastar expression that evaluates to a URL string.
 */
export const queryUrl = (path: string, params: Readonly<Record<string, ExprInput<string | number | boolean>>>): Expr<string> => {
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

/**
 * Serializes fetch action URLs while allowing reactive URL expressions.
 */
const urlToJs = (url: ExprInput<string>): string => typeof url === "string" ? JSON.stringify(url) : url.toDatastarExpression()

/**
 * Builds a Datastar fetch action expression for one HTTP method.
 */
const fetchAction = (method: "get" | "post" | "put" | "patch" | "delete", url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => {
  if (options === undefined || Object.keys(options).length === 0) {
    return raw(`@${method}(${urlToJs(url)})`)
  }

  return raw(`@${method}(${urlToJs(url)}, ${fetchOptionsToJs(options)})`)
}

/** Creates a Datastar `@get()` action expression. @see https://data-star.dev/reference/actions#get */
export const get = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => fetchAction("get", url, options)

/** Creates a Datastar `@post()` action expression. @see https://data-star.dev/reference/actions#post */
export const post = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => fetchAction("post", url, options)

/** Creates a Datastar `@put()` action expression. @see https://data-star.dev/reference/actions#put */
export const put = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => fetchAction("put", url, options)

/** Creates a Datastar `@patch()` action expression. @see https://data-star.dev/reference/actions#patch */
export const patch = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => fetchAction("patch", url, options)

/** Creates a Datastar `@delete()` action expression. */
const del = (url: ExprInput<string>, options?: FetchActionOptions): Expr<void> => fetchAction("delete", url, options)

/**
 * Builds a Datastar action call expression.
 */
const datastarAction = <T = unknown>(name: string, ...args: ReadonlyArray<ExprInput<unknown>>): Expr<T> =>
  raw(`@${name}(${args.map((arg) => toJs(arg)).join(", ")})`)

/** Creates a Datastar `@peek()` action expression. @see https://data-star.dev/reference/actions#peek */
export const peek = <T = unknown>(callback: Expr<DatastarFunction<T>>): Expr<T> => datastarAction<T>("peek", callback)

/** Creates a Datastar `@setAll()` action expression. @see https://data-star.dev/reference/actions#setall */
export const setAll = (value: ExprInput<unknown>, filter?: SignalFilter): Expr<void> =>
  filter === undefined ? datastarAction<void>("setAll", value) : datastarAction<void>("setAll", value, filter)

/** Creates a Datastar `@toggleAll()` action expression. @see https://data-star.dev/reference/actions#toggleall */
export const toggleAll = (filter?: SignalFilter): Expr<void> =>
  filter === undefined ? datastarAction<void>("toggleAll") : datastarAction<void>("toggleAll", filter)

/** Datastar duration modifier value. */
export type Duration = number | `${number}ms` | `${number}s`

/** Supported Datastar `__case` modifier values. */
export type CaseModifier = "camel" | "kebab" | "snake" | "pascal"

/** Options for a Datastar debounce modifier. */
export interface DebounceOptions {
  /** Debounce duration. */
  readonly duration: Duration
  /** Whether the expression should run at the start of the debounce window. */
  readonly leading?: boolean
  /** Whether the expression should skip the trailing call. */
  readonly noTrailing?: boolean
}

/** Options for a Datastar throttle modifier. */
export interface ThrottleOptions {
  /** Throttle duration. */
  readonly duration: Duration
  /** Whether the expression should skip the leading call. */
  readonly noLeading?: boolean
  /** Whether the expression should run at the end of the throttle window. */
  readonly trailing?: boolean
}

/** Datastar timing modifiers shared by event-like attributes. */
export interface TimingModifiers {
  /** Delay before running the expression. */
  readonly delay?: Duration
  /** Debounce behavior for the expression. */
  readonly debounce?: Duration | DebounceOptions
  /** Throttle behavior for the expression. */
  readonly throttle?: Duration | ThrottleOptions
  /** Whether to wrap the expression in the View Transition API when available. */
  readonly viewTransition?: boolean
}

/** Datastar `data-on` modifiers. @see https://data-star.dev/reference/attributes#data-on */
export interface OnModifiers extends TimingModifiers {
  /** Only trigger the listener once. */
  readonly once?: boolean
  /** Register a passive event listener. */
  readonly passive?: boolean
  /** Register a capture-phase event listener. */
  readonly capture?: boolean
  /** Convert the event-name casing before rendering the attribute. */
  readonly case?: CaseModifier
  /** Attach the listener to `window`. */
  readonly window?: boolean
  /** Attach the listener to `document`. */
  readonly document?: boolean
  /** Trigger only when the event target is outside the element. */
  readonly outside?: boolean
  /** Call `preventDefault()` before running the expression. */
  readonly prevent?: boolean
  /** Call `stopPropagation()` before running the expression. */
  readonly stop?: boolean
}

/** Datastar `data-on-intersect` modifiers. @see https://data-star.dev/reference/attributes#data-on-intersect */
export interface IntersectModifiers extends TimingModifiers {
  /** Only trigger once. */
  readonly once?: boolean
  /** Trigger when the element exits instead of enters the viewport. */
  readonly exit?: boolean
  /** Trigger when half the element is visible. */
  readonly half?: boolean
  /** Trigger when the full element is visible. */
  readonly full?: boolean
  /** Visibility percentage threshold from `0` to `100`. */
  readonly threshold?: number
}

/** Datastar `data-on-interval` modifiers. @see https://data-star.dev/reference/attributes#data-on-interval */
export interface IntervalModifiers {
  /** Interval duration. @defaultValue `"1s"` */
  readonly duration?: Duration
  /** Whether to run the expression immediately before the first interval. */
  readonly leading?: boolean
  /** Whether to wrap the expression in the View Transition API when available. */
  readonly viewTransition?: boolean
}

/** Datastar `data-init` modifiers. @see https://data-star.dev/reference/attributes#data-init */
export interface InitModifiers {
  /** Delay before running the expression. */
  readonly delay?: Duration
  /** Whether to wrap the expression in the View Transition API when available. */
  readonly viewTransition?: boolean
}

/** Datastar `__case` modifier bag shared by keyed attributes. */
export interface CaseModifiers {
  /** Convert the keyed name casing before rendering the attribute. */
  readonly case?: CaseModifier
}

/** Datastar `data-bind` modifiers. @see https://data-star.dev/reference/attributes#data-bind */
export interface BindModifiers extends CaseModifiers {
  /** Element property to bind instead of Datastar's default property. */
  readonly prop?: string
  /** Event or events that sync the element property back to the signal. */
  readonly events?: string | ReadonlyArray<string>
}

/** Datastar `data-signals` keyed modifiers. @see https://data-star.dev/reference/attributes#data-signals */
export interface DataSignalModifiers extends CaseModifiers {
  /** Only set the signal value when the key is missing. */
  readonly ifMissing?: boolean
}

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

/** Normalizes numeric durations to Datastar's millisecond modifier syntax. */
const durationModifier = (duration: Duration): string => typeof duration === "number" ? `${duration}ms` : duration

/** Appends shared delay/debounce/throttle/view-transition modifiers in Datastar order. */
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

/** Renders Datastar modifier suffixes using the `__` delimiter. */
const modifierSuffix = (parts: ReadonlyArray<string>): string => parts.length === 0 ? "" : `__${parts.join("__")}`

/** Renders the shared Datastar `__case` modifier. */
const caseModifierSuffix = (modifiers: CaseModifiers = {}): string =>
  modifiers.case === undefined ? "" : `__case.${modifiers.case}`

/** Validates keyed signal names unless a Datastar case modifier owns conversion. */
const assertUnmodifiedSignalName = (name: string, modifiers: CaseModifiers): void => {
  if (modifiers.case === undefined) {
    assertSignalName(name)
  }
}

/** Accepts either a signal reference or its raw signal path. */
const signalKeyName = <Name extends string>(name: Name | { readonly name: Name }): Name =>
  typeof name === "string" ? name : name.name

/** Serializes `data-init` modifiers. */
const initModifiers = (modifiers: InitModifiers = {}): string => {
  const parts: Array<string> = []
  if (modifiers.delay !== undefined) parts.push(`delay.${durationModifier(modifiers.delay)}`)
  if (modifiers.viewTransition === true) parts.push("viewtransition")
  return modifierSuffix(parts)
}

/** Serializes `data-bind` modifiers. */
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

/** Serializes keyed `data-signals` modifiers. */
const dataSignalModifiers = (modifiers: DataSignalModifiers = {}): string => {
  const parts = modifiers.case === undefined ? [] : [`case.${modifiers.case}`]
  if (modifiers.ifMissing === true) parts.push("ifmissing")
  return modifierSuffix(parts)
}

/** Serializes `data-on` modifiers. */
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

/** Serializes `data-on-intersect` modifiers. */
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

/** Serializes `data-on-interval` modifiers. */
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

/** A nested object of computed signal functions. */
export type DataComputedValue = Expr<DatastarFunction<unknown>> | { readonly [key: string]: DataComputedValue }

/** Object-valued `data-computed` input. */
export type DataComputedObject = Readonly<Record<string, DataComputedValue>>

/** Ensures object-valued computed signals use valid signal paths before rendering attributes. */
const assertDataComputedObjectKeys = (values: DataComputedObject): void => {
  for (const [key, value] of Object.entries(values)) {
    assertSignalName(key)

    if (!isExpr(value)) {
      assertDataComputedObjectKeys(value)
    }
  }
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

/** Ensures object-valued signal state uses valid signal paths before rendering attributes. */
const assertSignalObjectKeys = (values: SignalStateInput): void => {
  for (const [key, value] of Object.entries(values)) {
    assertSignalName(key)

    if (typeof value === "object" && value !== null && !Array.isArray(value) && !isExpr(value)) {
      assertSignalObjectKeys(value as SignalStateInput)
    }
  }
}

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

/** Creates a Datastar `@delete()` action expression. @see https://data-star.dev/reference/actions#delete */
export { del as delete }
