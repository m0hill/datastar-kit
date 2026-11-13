// Checks rendered Datastar attribute names for the JSX checker. It lives here, not in the SDK,
// because only this repository's checker uses it.
import {
  datastarAttributeDefinitions,
  datastarAttributeRoot,
  modifierTargetOf,
  resolveDatastarAttributeRoot
} from "../../packages/datastar-kit/src/ds/attribute-metadata.js"
import {
  datastarModifierKeys,
  datastarModifierSuffix,
  isDatastarModifierCompatible
} from "../../packages/datastar-kit/src/ds/modifier-rendering.js"
import type { DatastarModifierKey } from "../../packages/datastar-kit/src/ds/modifiers.js"

const datastarModifierKeyForSuffix = (suffix: string): DatastarModifierKey | undefined =>
  datastarModifierKeys.find((key) => datastarModifierSuffix(key) === suffix)

/** Result of inspecting a rendered Datastar attribute name. */
export type DatastarAttributeNameInspection =
  | {
      /** The name does not belong to a canonical Datastar attribute. */
      readonly _tag: "custom"
      /** Custom attribute name without a key or modifiers. */
      readonly baseName: string
      /** Nearby canonical name when the custom name is likely a typo. */
      readonly suggestion: string | undefined
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

/** Returns the candidate within one edit of `name`, the likely intended spelling of a typo. */
export const closestName = (name: string, candidates: readonly string[]): string | undefined => {
  let closest: string | undefined
  let closestDistance = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const distance = damerauLevenshteinDistance(name, candidate)
    if (distance < closestDistance) {
      closest = candidate
      closestDistance = distance
    }
  }

  return closestDistance <= 1 ? closest : undefined
}

const datastarAttributeNames = datastarAttributeDefinitions.map((definition) => definition.name)

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
    return {
      _tag: "custom",
      baseName,
      suggestion: closestName(baseName, datastarAttributeNames)
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

  const target = modifierTargetOf(resolved)
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
