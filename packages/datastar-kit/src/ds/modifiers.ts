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

export const durationModifier = (duration: Duration): string =>
  typeof duration === "number" ? `${duration}ms` : duration

export const appendTimingModifiers = (parts: Array<string>, modifiers: TimingModifiers): void => {
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

export const modifierSuffix = (parts: ReadonlyArray<string>): string =>
  parts.length === 0 ? "" : `__${parts.join("__")}`

export const caseModifierSuffix = (modifiers: CaseModifiers = {}): string =>
  modifiers.case === undefined ? "" : `__case.${modifiers.case}`

export const initModifiers = (modifiers: InitModifiers = {}): string => {
  const parts: Array<string> = []
  if (modifiers.delay !== undefined) parts.push(`delay.${durationModifier(modifiers.delay)}`)
  if (modifiers.viewTransition === true) parts.push("viewtransition")
  return modifierSuffix(parts)
}

export const bindModifiers = (modifiers: BindModifiers = {}): string => {
  const parts: Array<string> = []
  if (modifiers.case !== undefined) parts.push(`case.${modifiers.case}`)
  if (modifiers.prop !== undefined) parts.push(`prop.${modifiers.prop}`)
  if (modifiers.events !== undefined) {
    const events = typeof modifiers.events === "string" ? [modifiers.events] : modifiers.events
    if (events.length > 0) parts.push(`event.${events.join(".")}`)
  }
  return modifierSuffix(parts)
}

export const dataSignalModifiers = (modifiers: DataSignalModifiers = {}): string => {
  const parts = modifiers.case === undefined ? [] : [`case.${modifiers.case}`]
  if (modifiers.ifMissing === true) parts.push("ifmissing")
  return modifierSuffix(parts)
}

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
