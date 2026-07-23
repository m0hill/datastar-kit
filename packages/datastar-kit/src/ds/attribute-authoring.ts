import {
  datastarAttributeDefinitions,
  datastarAttributeRoot,
  datastarModifierTarget,
  isDatastarAttribute,
  isDatastarExpressionAttribute,
  isDatastarSignalNameAttribute,
  resolveDatastarAttributeRoot
} from "./attribute-metadata.js"
import { isExpr, toJs } from "./expression.js"
import {
  datastarModifierKeyForSuffix,
  isDatastarModifierCompatible,
  renderDatastarModifierSuffixes
} from "./modifier-rendering.js"
import { isDatastarModifiedValue } from "./modifiers.js"
import { Signal } from "./signals.js"

/** Result of inspecting a rendered Datastar attribute name. */
export type DatastarAttributeNameInspection =
  | {
      /** The name does not belong to a canonical Datastar attribute. */
      readonly _tag: "custom"
      /** Custom attribute name without a key or modifiers. */
      readonly baseName: string
      /** Nearby canonical name when the custom name is likely a typo. */
      readonly suggestion?: string
    }
  | {
      /** The name is a valid canonical Datastar attribute form. */
      readonly _tag: "known"
      /** Canonical attribute name without a key or modifiers. */
      readonly name: string
    }
  | {
      /** The name belongs to a canonical attribute but violates its key or modifier policy. */
      readonly _tag: "invalid"
      /** Policy category violated by the rendered name. */
      readonly category: "key" | "modifier"
      /** Human-readable explanation suitable for a source diagnostic. */
      readonly message: string
    }

/** A JSX attribute after Datastar-specific name and value normalization. */
export type NormalizedDatastarAttribute = {
  /** Rendered attribute name, including modifier suffixes when present. */
  readonly name: string
  /** Value ready for the generic JSX primitive-value check. */
  readonly value: unknown
}

const isDatastarSerializableValue = (name: string, value: unknown): boolean =>
  isExpr(value) ||
  Array.isArray(value) ||
  (typeof value === "object" && value !== null) ||
  (isDatastarExpressionAttribute(name) &&
    (typeof value === "number" || typeof value === "boolean" || value === null))

const damerauLevenshteinDistance = (left: string, right: string): number => {
  const rows = left.length + 1
  const columns = right.length + 1
  const distances = Array.from({ length: rows }, () => Array<number>(columns).fill(0))
  const distanceAt = (row: number, column: number): number => distances[row]?.[column] ?? 0

  for (let row = 0; row < rows; row += 1) {
    const values = distances[row]
    if (values !== undefined) values[0] = row
  }
  const firstRow = distances[0]
  if (firstRow !== undefined) {
    for (let column = 0; column < columns; column += 1) firstRow[column] = column
  }

  for (let row = 1; row < rows; row += 1) {
    const values = distances[row]
    if (values === undefined) continue

    for (let column = 1; column < columns; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1
      const deletion = distanceAt(row - 1, column) + 1
      const insertion = distanceAt(row, column - 1) + 1
      const substitution = distanceAt(row - 1, column - 1) + substitutionCost
      let distance = Math.min(deletion, insertion, substitution)

      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        distance = Math.min(distance, distanceAt(row - 2, column - 2) + 1)
      }

      values[column] = distance
    }
  }

  return distanceAt(left.length, right.length)
}

const closestDatastarAttributeName = (name: string): string | undefined => {
  let closest: string | undefined
  let closestDistance = Number.POSITIVE_INFINITY

  for (const definition of datastarAttributeDefinitions) {
    const distance = damerauLevenshteinDistance(name, definition.name)
    if (distance < closestDistance) {
      closest = definition.name
      closestDistance = distance
    }
  }

  return closestDistance <= 1 ? closest : undefined
}

const normalizeDatastarValue = (name: string, value: unknown): unknown => {
  if (value instanceof Signal && isDatastarSignalNameAttribute(name)) {
    return value.name
  }

  if (isDatastarSerializableValue(name, value)) {
    return toJs(value)
  }

  return value
}

/**
 * Normalizes one authored JSX attribute using Datastar serialization and modifier policy.
 *
 * Non-`data-*` attributes pass through unchanged. Canonical and custom `data-*` attributes share
 * structured expression serialization, while canonical metadata controls signal-name values,
 * primitive expression values, and modifier compatibility.
 *
 * @param name - Normalized HTML attribute name supplied by the JSX runtime.
 * @param value - Authored JSX attribute value.
 * @returns The rendered attribute name and its normalized value.
 * @throws {TypeError} When a modifier wrapper targets an unsupported attribute or modifier.
 */
export const normalizeDatastarAttribute = (
  name: string,
  value: unknown
): NormalizedDatastarAttribute => {
  if (!isDatastarAttribute(name)) {
    return { name, value }
  }

  if (isDatastarModifiedValue(value)) {
    const target = datastarModifierTarget(name)
    if (target === undefined) {
      throw new TypeError(`Datastar attribute ${JSON.stringify(name)} does not accept modifiers`)
    }

    const suffixes = renderDatastarModifierSuffixes(target, name, value.modifiers)
    return {
      name: suffixes.length === 0 ? name : `${name}__${suffixes.join("__")}`,
      value: normalizeDatastarValue(name, value.value)
    }
  }

  return { name, value: normalizeDatastarValue(name, value) }
}

/**
 * Inspects a rendered attribute name against canonical Datastar key and modifier policy.
 *
 * Unknown names are classified as custom because primitive custom `data-*` attributes are valid
 * authoring extensions. The inspection is pure and does not inspect the attribute value.
 *
 * @param name - Rendered Datastar attribute name, including handwritten modifier suffixes.
 * @returns A known, custom, or invalid name inspection.
 */
export const inspectDatastarAttributeName = (name: string): DatastarAttributeNameInspection => {
  const root = datastarAttributeRoot(name)
  const resolved = resolveDatastarAttributeRoot(root)
  if (resolved === undefined) {
    const [baseName = root] = root.split(":", 1)
    const suggestion = closestDatastarAttributeName(baseName)
    return {
      _tag: "custom",
      baseName,
      ...(suggestion === undefined ? {} : { suggestion })
    }
  }

  if (resolved.form === "exact" && resolved.definition.key === "required") {
    return {
      _tag: "invalid",
      category: "key",
      message: `${JSON.stringify(resolved.definition.name)} requires a key after ':'`
    }
  }
  if (resolved.form === "key" && resolved.definition.key === "forbidden") {
    return {
      _tag: "invalid",
      category: "key",
      message: `${JSON.stringify(resolved.definition.name)} does not accept a key`
    }
  }
  if (resolved.form === "key" && resolved.key.length === 0) {
    return {
      _tag: "invalid",
      category: "key",
      message: `${JSON.stringify(resolved.definition.name)} has an empty key`
    }
  }

  const [, ...modifiers] = name.split("__")
  if (modifiers.length === 0) {
    return { _tag: "known", name: resolved.definition.name }
  }

  const target = datastarModifierTarget(name)
  if (target === undefined) {
    return {
      _tag: "invalid",
      category: "modifier",
      message: `${JSON.stringify(root)} does not accept modifiers`
    }
  }

  for (const modifier of modifiers) {
    const [suffix = ""] = modifier.split(".")
    const key = datastarModifierKeyForSuffix(suffix)
    if (key === undefined) {
      return {
        _tag: "invalid",
        category: "modifier",
        message: `Unknown Datastar modifier ${JSON.stringify(suffix)}`
      }
    }
    if (!isDatastarModifierCompatible(target, key)) {
      return {
        _tag: "invalid",
        category: "modifier",
        message: `Modifier ${JSON.stringify(suffix)} is not valid on ${JSON.stringify(root)}`
      }
    }
  }

  return { _tag: "known", name: resolved.definition.name }
}

export { isDatastarPresenceAttribute } from "./attribute-metadata.js"
export type { DatastarModifierKeysFor } from "./modifier-rendering.js"
