import {
  datastarModifierTarget,
  isDatastarAttribute,
  isDatastarExpressionAttribute,
  isDatastarSignalNameAttribute,
  type DatastarModifierTarget
} from "./ds/attribute-metadata.js"
import { isExpr, toJs, type Expr } from "./ds/expression.js"
import {
  datastarCaseModifiers,
  isDatastarModifiedValue,
  type DatastarModifiedValue,
  type DatastarModifierKey
} from "./ds/modifiers.js"
import { Signal } from "./ds/signals.js"
import type { HtmlChild, HtmlProps, HtmlPropValue } from "./html.js"
import { h } from "./html.js"

/**
 * Internal JSX element result accepted by the automatic runtime.
 *
 * @internal
 */
export type JsxElement = HtmlChild

/**
 * Internal JSX props accepted by intrinsic HTML elements.
 *
 * @internal
 */
type DatastarJsxValue =
  | HtmlPropValue
  | Expr
  | DatastarModifiedValue
  | readonly DatastarJsxValue[]
  | { readonly [key: string]: DatastarJsxValue }

interface DatastarModifier {
  readonly key: DatastarModifierKey
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
export type JsxComponent = (props: JsxComponentProps) => HtmlChild

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

const compatibleModifierTargets = {
  capture: ["on"],
  case: ["bind", "case", "computed", "on", "signals"],
  debounce: ["on", "intersect", "signalPatch"],
  delay: ["on", "intersect", "signalPatch", "init"],
  document: ["on"],
  duration: ["interval"],
  event: ["bind"],
  exit: ["intersect"],
  full: ["intersect"],
  half: ["intersect"],
  ifMissing: ["signals"],
  leading: [],
  once: ["on", "intersect"],
  outside: ["on"],
  passive: ["on"],
  prevent: ["on"],
  prop: ["bind"],
  self: ["ignore"],
  stop: ["on"],
  terse: ["jsonSignals"],
  threshold: ["intersect"],
  throttle: ["on", "intersect", "signalPatch"],
  viewTransition: ["on", "intersect", "init", "interval"],
  window: ["on"]
} as const satisfies Record<DatastarModifierKey, readonly DatastarModifierTarget[]>

const isDatastarModifierKey = (key: string): key is DatastarModifierKey =>
  key in compatibleModifierTargets

const isCompatibleModifier = (
  target: DatastarModifierTarget,
  modifier: DatastarModifier
): boolean =>
  (compatibleModifierTargets[modifier.key] as readonly DatastarModifierTarget[]).includes(target)

const flagModifier = (
  key: DatastarModifierKey,
  value: unknown,
  suffix: string
): DatastarModifier | undefined => {
  if (value === false || value === null || value === undefined) return undefined
  if (value === true) return { key, suffix }
  throw new TypeError(`Datastar modifier ${JSON.stringify(key)} expects a boolean value`)
}

const durationTaggedModifier = (
  key: DatastarModifierKey,
  value: unknown,
  modifier: string
): DatastarModifier | undefined => {
  if (value === false || value === null || value === undefined) return undefined
  if (value === true) return { key, suffix: modifier }
  return { key, suffix: `${modifier}.${durationModifier(value)}` }
}

const timingTaggedModifier = (
  key: DatastarModifierKey,
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
  key: DatastarModifierKey,
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

const caseModifiers = new Set<string>(datastarCaseModifiers)

const cleanDatastarModifier = (key: string, value: unknown): DatastarModifier | undefined => {
  if (!isDatastarModifierKey(key)) {
    throw new TypeError(`Unknown Datastar modifier ${JSON.stringify(key)}`)
  }

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

  if (isDatastarModifiedValue(value)) {
    const target = datastarModifierTarget(name)
    if (target === undefined) {
      throw new TypeError(`Datastar attribute ${JSON.stringify(name)} does not accept modifiers`)
    }

    const suffixes = cleanDatastarModifiers(target, name, value.modifiers)

    return {
      name: suffixes.length === 0 ? name : `${name}__${suffixes.join("__")}`,
      value: cleanDatastarValue(name, value.value)
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
