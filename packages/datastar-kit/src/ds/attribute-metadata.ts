type DatastarAttributeForm = "exact" | "key"
type DatastarAttributeKeyPolicy = "forbidden" | "optional" | "required"

export type DatastarModifierTarget =
  | "bind"
  | "bindKey"
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
  | "signalsKey"

type DatastarAttributeDefinition = {
  readonly name: string
  readonly key: DatastarAttributeKeyPolicy
  readonly presence?: readonly DatastarAttributeForm[]
  readonly expression?: readonly DatastarAttributeForm[]
  readonly exactModifierTarget?: DatastarModifierTarget
  readonly keyedModifierTarget?: DatastarModifierTarget
  readonly signalNameValue?: boolean
}

/** Canonical Datastar attribute names and key, expression, presence, and modifier behavior. */
export const datastarAttributeDefinitions = [
  { name: "data-attr", key: "optional", expression: ["exact", "key"] },
  {
    name: "data-bind",
    key: "optional",
    presence: ["exact", "key"],
    exactModifierTarget: "bind",
    keyedModifierTarget: "bindKey",
    signalNameValue: true
  },
  {
    name: "data-class",
    key: "optional",
    expression: ["exact", "key"],
    keyedModifierTarget: "case"
  },
  {
    name: "data-computed",
    key: "optional",
    expression: ["exact", "key"],
    keyedModifierTarget: "computed"
  },
  { name: "data-effect", key: "forbidden", expression: ["exact"] },
  {
    name: "data-ignore",
    key: "forbidden",
    presence: ["exact"],
    exactModifierTarget: "ignore"
  },
  { name: "data-ignore-morph", key: "forbidden", presence: ["exact"] },
  {
    name: "data-indicator",
    key: "optional",
    presence: ["exact", "key"],
    keyedModifierTarget: "case",
    signalNameValue: true
  },
  {
    name: "data-init",
    key: "forbidden",
    expression: ["exact"],
    exactModifierTarget: "init"
  },
  {
    name: "data-json-signals",
    key: "forbidden",
    presence: ["exact"],
    exactModifierTarget: "jsonSignals"
  },
  {
    name: "data-on",
    key: "required",
    expression: ["key"],
    keyedModifierTarget: "on"
  },
  {
    name: "data-on-intersect",
    key: "forbidden",
    expression: ["exact"],
    exactModifierTarget: "intersect"
  },
  {
    name: "data-on-interval",
    key: "forbidden",
    expression: ["exact"],
    exactModifierTarget: "interval"
  },
  {
    name: "data-on-signal-patch",
    key: "forbidden",
    expression: ["exact"],
    exactModifierTarget: "signalPatch"
  },
  { name: "data-on-signal-patch-filter", key: "forbidden" },
  { name: "data-persist", key: "optional", presence: ["exact", "key"] },
  { name: "data-preserve-attr", key: "forbidden" },
  { name: "data-query-string", key: "forbidden", presence: ["exact"] },
  {
    name: "data-ref",
    key: "optional",
    presence: ["exact", "key"],
    keyedModifierTarget: "case",
    signalNameValue: true
  },
  { name: "data-scope-children", key: "forbidden", presence: ["exact"] },
  { name: "data-scroll-into-view", key: "forbidden", presence: ["exact"] },
  { name: "data-show", key: "forbidden", expression: ["exact"] },
  {
    name: "data-signals",
    key: "optional",
    presence: ["key"],
    expression: ["exact", "key"],
    exactModifierTarget: "signals",
    keyedModifierTarget: "signalsKey"
  },
  { name: "data-style", key: "optional", expression: ["exact", "key"] },
  { name: "data-text", key: "forbidden", expression: ["exact"] }
] as const satisfies readonly DatastarAttributeDefinition[]

/** A canonical Datastar attribute resolved to its exact or keyed form. */
export type ResolvedDatastarAttribute =
  | {
      readonly definition: DatastarAttributeDefinition
      readonly form: "exact"
    }
  | {
      readonly definition: DatastarAttributeDefinition
      readonly form: "key"
      readonly key: string
    }

const appliesToForm = (
  forms: readonly DatastarAttributeForm[] | undefined,
  form: DatastarAttributeForm
): boolean => forms?.includes(form) ?? false

/** Returns the attribute name before any handwritten `__modifier` suffixes. */
export const datastarAttributeRoot = (name: string): string => name.split("__", 1)[0] ?? name

/** Resolves a modifier-free attribute name against the canonical Datastar attributes. */
export const resolveDatastarAttributeRoot = (
  root: string
): ResolvedDatastarAttribute | undefined => {
  const separator = root.indexOf(":")
  const name = separator === -1 ? root : root.slice(0, separator)
  const definition: DatastarAttributeDefinition | undefined = datastarAttributeDefinitions.find(
    (candidate) => candidate.name === name
  )
  if (definition === undefined) return undefined

  return separator === -1
    ? { definition, form: "exact" }
    : { definition, form: "key", key: root.slice(separator + 1) }
}

const resolveDatastarAttribute = (name: string): ResolvedDatastarAttribute | undefined =>
  resolveDatastarAttributeRoot(datastarAttributeRoot(name))

/** Returns whether a name belongs to an HTML `data-*` attribute. */
export const isDatastarAttribute = (name: string): boolean => name.startsWith("data-")

export const isDatastarPresenceAttribute = (name: string): boolean => {
  const resolved = resolveDatastarAttribute(name)
  return resolved !== undefined && appliesToForm(resolved.definition.presence, resolved.form)
}

export const datastarModifierTarget = (name: string): DatastarModifierTarget | undefined => {
  const resolved = resolveDatastarAttribute(name)
  if (resolved === undefined) return undefined
  return resolved.form === "exact"
    ? resolved.definition.exactModifierTarget
    : resolved.definition.keyedModifierTarget
}

export const isDatastarExpressionAttribute = (name: string): boolean => {
  const resolved = resolveDatastarAttribute(name)
  return resolved !== undefined && appliesToForm(resolved.definition.expression, resolved.form)
}

export const isDatastarSignalNameAttribute = (name: string): boolean => {
  const resolved = resolveDatastarAttribute(name)
  return resolved?.form === "exact" && resolved.definition.signalNameValue === true
}
