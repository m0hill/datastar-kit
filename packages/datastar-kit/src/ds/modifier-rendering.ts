import type { DatastarModifierTarget } from "./attribute-metadata.js"
import { isExpr } from "./expression.js"
import { datastarCaseModifiers, type DatastarModifierKey } from "./modifiers.js"

const compatibleModifierTargets = {
  capture: ["on"],
  case: ["bindKey", "case", "computed", "on", "signalsKey"],
  debounce: ["on", "intersect", "signalPatch"],
  delay: ["on", "intersect", "signalPatch", "init"],
  document: ["on"],
  duration: ["interval"],
  event: ["bind", "bindKey"],
  exit: ["intersect"],
  full: ["intersect"],
  half: ["intersect"],
  ifMissing: ["signals", "signalsKey"],
  leading: ["interval"],
  once: ["on", "intersect"],
  outside: ["on"],
  passive: ["on"],
  prevent: ["on"],
  prop: ["bind", "bindKey"],
  self: ["ignore"],
  stop: ["on"],
  terse: ["jsonSignals"],
  threshold: ["intersect"],
  throttle: ["on", "intersect", "signalPatch"],
  viewTransition: ["on", "intersect", "init", "interval"],
  window: ["on"]
} as const satisfies Record<DatastarModifierKey, readonly DatastarModifierTarget[]>

/**
 * Modifier keys accepted by one Datastar attribute modifier target.
 *
 * @internal
 */
export type DatastarModifierKeysFor<Target extends DatastarModifierTarget> = {
  [Key in DatastarModifierKey]: Target extends (typeof compatibleModifierTargets)[Key][number]
    ? Key
    : never
}[DatastarModifierKey]

const caseModifiers = new Set<string>(datastarCaseModifiers)

const isDatastarModifierKey = (key: string): key is DatastarModifierKey =>
  Object.hasOwn(compatibleModifierTargets, key)

/** @internal Every modifier key the SDK can render. */
export const datastarModifierKeys =
  Object.keys(compatibleModifierTargets).filter(isDatastarModifierKey)

/** @internal The `__suffix` Datastar reads for a modifier key: the key in lowercase. */
export const datastarModifierSuffix = (key: DatastarModifierKey): string => key.toLowerCase()

/** @internal Returns whether a modifier key is supported by an attribute modifier target. */
export const isDatastarModifierCompatible = (
  target: DatastarModifierTarget,
  key: DatastarModifierKey
): boolean => {
  const targets: readonly DatastarModifierTarget[] = compatibleModifierTargets[key]
  return targets.includes(target)
}

const durationModifier = (value: unknown): string => {
  if (typeof value === "number") return `${value}ms`
  if (typeof value === "string") return /^\d+$/.test(value) ? `${value}ms` : value
  throw new TypeError(`Unsupported Datastar duration modifier value: ${JSON.stringify(value)}`)
}

const isModifierRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null && !Array.isArray(value) && !isExpr(value)

// `false`, `null`, and `undefined` leave a modifier off, so callers can toggle one conditionally.
const isModifierOff = (value: unknown): boolean =>
  value === false || value === null || value === undefined

const timingTags = (key: "debounce" | "throttle", value: unknown): string => {
  if (!isModifierRecord(value)) return durationModifier(value)

  const duration = value.duration
  if (duration === undefined) {
    throw new TypeError(`Datastar modifier ${JSON.stringify(key)} requires a duration`)
  }

  const tags = [durationModifier(duration)]
  if (key === "debounce") {
    if (value.leading === true) tags.push("leading")
    if (value.noTrailing === true) tags.push("notrailing")
  } else {
    if (value.noLeading === true) tags.push("noleading")
    if (value.trailing === true) tags.push("trailing")
  }
  return tags.join(".")
}

const valueTag = (key: DatastarModifierKey, value: unknown): string => {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new TypeError(`Datastar modifier ${JSON.stringify(key)} expects a string or number value`)
  }
  return String(value)
}

const eventTags = (value: unknown): string => {
  const events = typeof value === "string" ? [value] : Array.isArray(value) ? value : undefined
  if (events === undefined || events.some((event) => typeof event !== "string")) {
    throw new TypeError('Datastar modifier "event" expects a string or string array')
  }
  return events.join(".")
}

// Renders one modifier that is switched on: its suffix plus any `.tag` values.
const renderDatastarModifier = (key: DatastarModifierKey, value: unknown): string => {
  const suffix = datastarModifierSuffix(key)
  switch (key) {
    case "capture":
    case "document":
    case "exit":
    case "full":
    case "half":
    case "ifMissing":
    case "once":
    case "outside":
    case "passive":
    case "prevent":
    case "self":
    case "stop":
    case "terse":
    case "viewTransition":
    case "window":
      if (value !== true) {
        throw new TypeError(`Datastar modifier ${JSON.stringify(key)} expects a boolean value`)
      }
      return suffix
    case "duration":
    case "leading":
      // Only interval attributes accept these, and they render through intervalDurationSuffix.
      throw new TypeError(`Datastar modifier ${JSON.stringify(key)} renders with the interval`)
    case "delay":
      return value === true ? suffix : `${suffix}.${durationModifier(value)}`
    case "debounce":
    case "throttle":
      return value === true ? suffix : `${suffix}.${timingTags(key, value)}`
    case "case": {
      const tag = valueTag(key, value)
      if (!caseModifiers.has(tag)) {
        throw new TypeError(`Datastar modifier ${JSON.stringify(key)} received unsupported value`)
      }
      return `${suffix}.${tag}`
    }
    case "prop":
    case "threshold":
      return `${suffix}.${valueTag(key, value)}`
    case "event":
      return `${suffix}.${eventTags(value)}`
  }

  const exhaustive: never = key
  return exhaustive
}

// Datastar parses the first `__duration` tag as the interval, so a bare `__duration` or
// `__duration.leading` becomes a 0ms or NaN interval. Spell out its 1s default in those cases.
const datastarDefaultIntervalMs = 1000

const intervalDurationSuffix = (duration: unknown, leading: unknown): string | undefined => {
  if (!isModifierOff(leading) && leading !== true) {
    throw new TypeError('Datastar modifier "leading" expects a boolean value')
  }

  const explicitDuration =
    isModifierOff(duration) || duration === true ? undefined : durationModifier(duration)

  if (leading !== true) {
    return explicitDuration === undefined ? undefined : `duration.${explicitDuration}`
  }

  return `duration.${explicitDuration ?? `${datastarDefaultIntervalMs}ms`}.leading`
}

export const renderDatastarModifierSuffixes = (
  target: DatastarModifierTarget,
  name: string,
  modifiers: Readonly<Record<string, unknown>>
): string[] => {
  const suffixes: string[] = []

  for (const [key, value] of Object.entries(modifiers)) {
    if (!isDatastarModifierKey(key)) {
      throw new TypeError(`Unknown Datastar modifier ${JSON.stringify(key)}`)
    }
    // An interval's duration and leading render together as one tag, below.
    if (target === "interval" && (key === "duration" || key === "leading")) continue
    if (isModifierOff(value)) continue
    if (!isDatastarModifierCompatible(target, key)) {
      throw new TypeError(
        `Datastar modifier ${JSON.stringify(key)} is not valid on ${JSON.stringify(name)}`
      )
    }
    suffixes.push(renderDatastarModifier(key, value))
  }

  if (target === "interval") {
    const duration = intervalDurationSuffix(modifiers.duration, modifiers.leading)
    if (duration !== undefined) suffixes.unshift(duration)
  }

  return suffixes
}
