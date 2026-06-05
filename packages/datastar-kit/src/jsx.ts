import type { HtmlChild, HtmlNode, HtmlProps, HtmlPropValue } from "./html.js"
import { h } from "./html.js"
import { isExpr, toJs, type Expr } from "./ds/expression.js"
import { Signal } from "./ds/signals.js"

/**
 * Internal JSX element result accepted by the automatic runtime.
 *
 * @internal
 */
export type JsxElement = HtmlNode | readonly HtmlChild[]

/**
 * Internal JSX props accepted by intrinsic HTML elements.
 *
 * @internal
 */
type DatastarJsxValue =
  | HtmlPropValue
  | Expr
  | DatastarModifierTuple
  | readonly DatastarJsxValue[]
  | { readonly [key: string]: DatastarJsxValue }

type DatastarModifierTarget =
  | "bind"
  | "case"
  | "computed"
  | "ignore"
  | "init"
  | "intersect"
  | "interval"
  | "jsonSignals"
  | "on"
  | "signalPatch"
  | "signals"

type TimingModifierOptions = Readonly<{
  duration: string | number
  leading?: boolean
  noTrailing?: boolean
  noLeading?: boolean
  trailing?: boolean
}>

type CaseModifier = "camel" | "kebab" | "snake" | "pascal"

type DatastarModifierOptions = Readonly<{
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

type DatastarModifierTuple = readonly [DatastarJsxValue, DatastarModifierOptions]

interface DatastarModifier {
  readonly key: string
  readonly suffix: string
}

export type JsxProps = Readonly<
  Record<string, HtmlPropValue | HtmlChild | readonly HtmlChild[] | DatastarJsxValue>
>

/**
 * Internal props passed to function components by the JSX runtime.
 *
 * @internal
 */
export type JsxComponentProps = Readonly<Record<string, unknown>> & {
  readonly children?: HtmlChild | readonly HtmlChild[]
}

/**
 * Internal function component signature used by the JSX runtime.
 *
 * @internal
 */
export type JsxComponent = (props: JsxComponentProps) => JsxElement

const childrenProp = (
  children: readonly HtmlChild[]
): HtmlChild | readonly HtmlChild[] | undefined => {
  if (children.length === 0) {
    return undefined
  }
  if (children.length === 1) {
    return children[0]
  }
  return children
}

const normalizePropName = (key: string): string => {
  if (key === "className") return "class"
  if (key === "htmlFor") return "for"
  return key
}

const isPropValue = (value: unknown): value is HtmlPropValue =>
  value === null ||
  value === undefined ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean"

const isDatastarAttribute = (name: string): boolean => name.startsWith("data-")

const datastarAttributeRoot = (name: string): string => name.split("__", 1)[0] ?? name

const datastarModifierTarget = (name: string): DatastarModifierTarget | undefined => {
  const root = datastarAttributeRoot(name)

  if (root === "data-bind" || root.startsWith("data-bind:")) return "bind"
  if (
    root === "data-ref" ||
    root.startsWith("data-ref:") ||
    root === "data-indicator" ||
    root.startsWith("data-indicator:") ||
    root.startsWith("data-class:")
  ) {
    return "case"
  }
  if (root === "data-computed" || root.startsWith("data-computed:")) return "computed"
  if (root === "data-ignore") return "ignore"
  if (root === "data-init") return "init"
  if (root === "data-on-intersect") return "intersect"
  if (root === "data-on-interval") return "interval"
  if (root === "data-json-signals") return "jsonSignals"
  if (root === "data-on-signal-patch") return "signalPatch"
  if (root.startsWith("data-on:")) return "on"
  if (root === "data-signals" || root.startsWith("data-signals:")) return "signals"
  return undefined
}

const isDatastarExpressionAttribute = (name: string): boolean => {
  const root = datastarAttributeRoot(name)
  return (
    root === "data-signals" ||
    root.startsWith("data-signals:") ||
    root === "data-computed" ||
    root.startsWith("data-computed:") ||
    root === "data-attr" ||
    root.startsWith("data-attr:") ||
    root === "data-class" ||
    root.startsWith("data-class:") ||
    root === "data-style" ||
    root.startsWith("data-style:") ||
    root === "data-init" ||
    root === "data-effect" ||
    root === "data-text" ||
    root === "data-show" ||
    root === "data-on-intersect" ||
    root === "data-on-interval" ||
    root === "data-on-signal-patch" ||
    root.startsWith("data-on:")
  )
}

const isDatastarSignalNameAttribute = (name: string): boolean =>
  name === "data-bind" ||
  name.startsWith("data-bind__") ||
  name === "data-ref" ||
  name.startsWith("data-ref__") ||
  name === "data-indicator" ||
  name.startsWith("data-indicator__")

const isDatastarSerializableValue = (name: string, value: unknown): boolean =>
  isExpr(value) ||
  Array.isArray(value) ||
  (typeof value === "object" && value !== null) ||
  (isDatastarExpressionAttribute(name) &&
    (typeof value === "number" || typeof value === "boolean" || value === null))

const durationModifier = (value: unknown): string => {
  if (typeof value === "number") return `${value}ms`
  if (typeof value === "string") return /^\d+$/.test(value) ? `${value}ms` : value
  throw new TypeError(`Unsupported Datastar duration modifier value: ${JSON.stringify(value)}`)
}

const isModifierRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !isExpr(value)

const flagModifier = (
  key: string,
  value: unknown,
  suffix: string
): DatastarModifier | undefined => {
  if (value === false || value === null || value === undefined) return undefined
  if (value === true) return { key, suffix }
  throw new TypeError(`Datastar modifier ${JSON.stringify(key)} expects a boolean value`)
}

const durationTaggedModifier = (
  key: string,
  value: unknown,
  modifier: string
): DatastarModifier | undefined => {
  if (value === false || value === null || value === undefined) return undefined
  if (value === true) return { key, suffix: modifier }
  return { key, suffix: `${modifier}.${durationModifier(value)}` }
}

const timingTaggedModifier = (
  key: string,
  value: unknown,
  modifier: "debounce" | "throttle"
): DatastarModifier | undefined => {
  if (value === false || value === null || value === undefined) return undefined
  if (value === true) return { key, suffix: modifier }

  if (!isModifierRecord(value)) {
    return { key, suffix: `${modifier}.${durationModifier(value)}` }
  }

  const duration = value.duration
  if (duration === undefined) {
    throw new TypeError(`Datastar modifier ${JSON.stringify(key)} requires a duration`)
  }

  const parts = [durationModifier(duration)]
  if (modifier === "debounce") {
    if (value.leading === true) parts.push("leading")
    if (value.noTrailing === true) parts.push("notrailing")
  } else {
    if (value.noLeading === true) parts.push("noleading")
    if (value.trailing === true) parts.push("trailing")
  }
  return { key, suffix: `${modifier}.${parts.join(".")}` }
}

const valueTaggedModifier = (
  key: string,
  value: unknown,
  modifier: string,
  allowed?: ReadonlySet<string>
): DatastarModifier | undefined => {
  if (value === false || value === null || value === undefined) return undefined
  if (typeof value === "string" || typeof value === "number") {
    if (allowed !== undefined && !allowed.has(String(value))) {
      throw new TypeError(`Datastar modifier ${JSON.stringify(key)} received unsupported value`)
    }
    return { key, suffix: `${modifier}.${value}` }
  }
  throw new TypeError(`Datastar modifier ${JSON.stringify(key)} expects a string or number value`)
}

const eventModifier = (value: unknown): string => {
  const events = typeof value === "string" ? [value] : Array.isArray(value) ? value : undefined
  if (events === undefined || events.some((event) => typeof event !== "string")) {
    throw new TypeError('Datastar modifier "event" expects a string or string array')
  }
  return `event.${events.join(".")}`
}

const caseModifiers = new Set(["camel", "kebab", "snake", "pascal"])

const cleanDatastarModifier = (key: string, value: unknown): DatastarModifier | undefined => {
  switch (key) {
    case "capture":
    case "document":
    case "exit":
    case "full":
    case "half":
    case "leading":
    case "once":
    case "outside":
    case "passive":
    case "prevent":
    case "stop":
    case "window":
      return flagModifier(key, value, key)
    case "self":
      return flagModifier(key, value, "self")
    case "ifMissing":
      return flagModifier(key, value, "ifmissing")
    case "terse":
      return flagModifier(key, value, "terse")
    case "viewTransition":
      return flagModifier(key, value, "viewtransition")
    case "delay":
      return durationTaggedModifier(key, value, "delay")
    case "duration":
      return durationTaggedModifier(key, value, "duration")
    case "debounce":
      return timingTaggedModifier(key, value, "debounce")
    case "throttle":
      return timingTaggedModifier(key, value, "throttle")
    case "case":
      return valueTaggedModifier(key, value, key, caseModifiers)
    case "prop":
    case "threshold":
      return valueTaggedModifier(key, value, key)
    case "event":
      if (value === false || value === null || value === undefined) return undefined
      return { key, suffix: eventModifier(value) }
    default:
      throw new TypeError(`Unknown Datastar modifier ${JSON.stringify(key)}`)
  }
}

const intervalDurationModifier = (
  duration: unknown,
  leading: unknown,
  hasDuration: boolean
): DatastarModifier | undefined => {
  const durationEnabled = duration !== false && duration !== null && duration !== undefined
  const leadingEnabled = leading === true

  if (leading !== false && leading !== null && leading !== undefined && leading !== true) {
    throw new TypeError('Datastar modifier "leading" expects a boolean value')
  }

  if (!durationEnabled && !leadingEnabled) return undefined

  const parts: string[] = []
  if (hasDuration && duration !== true) {
    parts.push(durationModifier(duration))
  }
  if (leadingEnabled) {
    parts.push("leading")
  }

  return {
    key: "duration",
    suffix: parts.length === 0 ? "duration" : `duration.${parts.join(".")}`
  }
}

const isCompatibleModifier = (
  target: DatastarModifierTarget,
  modifier: DatastarModifier
): boolean => {
  const key = modifier.key

  if (key === "case")
    return (
      target === "bind" ||
      target === "case" ||
      target === "computed" ||
      target === "on" ||
      target === "signals"
    )
  if (key === "prop" || key === "event") return target === "bind"
  if (key === "self") return target === "ignore"
  if (key === "ifMissing") return target === "signals"
  if (key === "terse") return target === "jsonSignals"
  if (key === "duration") return target === "interval"
  if (key === "exit" || key === "half" || key === "full" || key === "threshold")
    return target === "intersect"
  if (key === "delay")
    return (
      target === "on" || target === "intersect" || target === "signalPatch" || target === "init"
    )
  if (key === "debounce" || key === "throttle")
    return target === "on" || target === "intersect" || target === "signalPatch"
  if (key === "viewTransition")
    return target === "on" || target === "intersect" || target === "init" || target === "interval"
  if (key === "once") return target === "on" || target === "intersect"
  if (
    key === "capture" ||
    key === "document" ||
    key === "outside" ||
    key === "passive" ||
    key === "prevent" ||
    key === "stop" ||
    key === "window"
  )
    return target === "on"

  return false
}

const cleanDatastarModifiers = (
  target: DatastarModifierTarget,
  name: string,
  modifiers: Readonly<Record<string, unknown>>
): string[] => {
  const suffixes: string[] = []
  let intervalDuration: unknown
  let intervalLeading: unknown
  let hasIntervalDuration = false

  for (const [key, modifierValue] of Object.entries(modifiers)) {
    if (target === "interval" && key === "duration") {
      intervalDuration = modifierValue
      hasIntervalDuration = true
      continue
    }
    if (target === "interval" && key === "leading") {
      intervalLeading = modifierValue
      continue
    }

    const modifier = cleanDatastarModifier(key, modifierValue)
    if (modifier === undefined) continue
    if (!isCompatibleModifier(target, modifier)) {
      throw new TypeError(
        `Datastar modifier ${JSON.stringify(key)} is not valid on ${JSON.stringify(name)}`
      )
    }
    suffixes.push(modifier.suffix)
  }

  if (target === "interval") {
    const duration = intervalDurationModifier(
      intervalDuration,
      intervalLeading,
      hasIntervalDuration
    )
    if (duration !== undefined) suffixes.unshift(duration.suffix)
  }

  return suffixes
}

const isDatastarModifierTuple = (
  name: string,
  value: unknown
): value is readonly [unknown, Readonly<Record<string, unknown>>] =>
  isDatastarAttribute(name) &&
  Array.isArray(value) &&
  value.length === 2 &&
  isModifierRecord(value[1])

const cleanDatastarValue = (name: string, value: unknown): unknown => {
  if (value instanceof Signal && isDatastarSignalNameAttribute(name)) {
    return value.name
  }

  if (isDatastarSerializableValue(name, value)) {
    return toJs(value)
  }

  return value
}

const cleanDatastarProp = (
  name: string,
  value: unknown
): { readonly name: string; readonly value: unknown } => {
  if (!isDatastarAttribute(name)) {
    return { name, value }
  }

  if (isDatastarModifierTuple(name, value)) {
    const target = datastarModifierTarget(name)
    if (target === undefined) {
      throw new TypeError(`Datastar attribute ${JSON.stringify(name)} does not accept modifiers`)
    }

    const [attributeValue, modifiers] = value
    const suffixes = cleanDatastarModifiers(target, name, modifiers)

    return {
      name: suffixes.length === 0 ? name : `${name}__${suffixes.join("__")}`,
      value: cleanDatastarValue(name, attributeValue)
    }
  }

  return { name, value: cleanDatastarValue(name, value) }
}

const cleanElementProps = (input: Readonly<Record<string, unknown>> | null): HtmlProps => {
  const cleaned: Record<string, HtmlPropValue> = {}

  for (const [key, value] of Object.entries(input ?? {})) {
    if (key === "__self" || key === "__source" || key === "children") {
      continue
    }

    const propName = normalizePropName(key)
    const prop = cleanDatastarProp(propName, value)
    if (key === "className" && cleaned.class !== undefined) {
      continue
    }

    if (!isPropValue(prop.value)) {
      throw new TypeError(`Unsupported JSX prop value for ${JSON.stringify(key)}`)
    }

    cleaned[prop.name] = prop.value
  }

  return cleaned
}

const cleanComponentProps = (
  input: Readonly<Record<string, unknown>> | null,
  children: readonly HtmlChild[]
): JsxComponentProps => {
  const cleaned: Record<string, unknown> & { children?: HtmlChild | readonly HtmlChild[] } = {}

  for (const [key, value] of Object.entries(input ?? {})) {
    if (key === "__self" || key === "__source" || key === "children") {
      continue
    }
    cleaned[key] = value
  }

  const child = childrenProp(children)
  if (child !== undefined) {
    cleaned.children = child
  }

  return cleaned
}

/**
 * Compiler-only JSX fragment component.
 *
 * @internal
 * @param props Fragment children supplied by the JSX transform.
 * @returns The children as a renderable array.
 */
export const Fragment = (props: {
  readonly children?: HtmlChild | readonly HtmlChild[]
}): readonly HtmlChild[] => {
  const children = props.children
  if (children === undefined) {
    return []
  }
  return Array.isArray(children) ? children : [children]
}

/**
 * Internal JSX tag input accepted by the automatic runtime.
 *
 * @internal
 */
export type JsxTag = string | typeof Fragment | JsxComponent

/**
 * Compiler-only factory used by `jsx-runtime` and `jsx-dev-runtime`.
 *
 * @internal
 * @param tag Intrinsic tag, fragment marker, or function component.
 * @param input Raw JSX props from the compiler.
 * @param children Normalized JSX children.
 * @returns An HTML node or fragment children.
 */
export const createJsxElement = (
  tag: JsxTag,
  input: Readonly<Record<string, unknown>> | null,
  children: readonly HtmlChild[]
): JsxElement => {
  if (tag === Fragment) {
    return children
  }

  if (typeof tag === "function") {
    return tag(cleanComponentProps(input, children))
  }

  return h(tag, cleanElementProps(input), ...children)
}
