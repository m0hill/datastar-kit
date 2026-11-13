import {
  isDatastarAttribute,
  isExpressionForm,
  modifierTargetOf,
  resolveDatastarAttribute,
  takesSignalName,
  type ResolvedDatastarAttribute
} from "./attribute-metadata.js"
import { toJs } from "./expression.js"
import { renderDatastarModifierSuffixes } from "./modifier-rendering.js"
import { isDatastarModifiedValue } from "./modifiers.js"
import { Signal } from "./signals.js"

/** A JSX attribute after Datastar-specific name and value normalization. */
export type NormalizedDatastarAttribute = {
  /** Rendered attribute name, including modifier suffixes when present. */
  readonly name: string
  /** Value ready for the generic JSX primitive-value check. */
  readonly value: unknown
}

// Objects (expressions, arrays, plain objects) always serialize; primitives only where the
// attribute takes expression source. Custom `data-*` attributes resolve to undefined.
const normalizeDatastarValue = (
  resolved: ResolvedDatastarAttribute | undefined,
  value: unknown
): unknown => {
  if (value instanceof Signal && resolved !== undefined && takesSignalName(resolved)) {
    return value.name
  }

  const serializable =
    (typeof value === "object" && value !== null) ||
    (resolved !== undefined &&
      isExpressionForm(resolved) &&
      (typeof value === "number" || typeof value === "boolean" || value === null))

  return serializable ? toJs(value) : value
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

  const resolved = resolveDatastarAttribute(name)

  if (isDatastarModifiedValue(value)) {
    const target = resolved === undefined ? undefined : modifierTargetOf(resolved)
    if (target === undefined) {
      throw new TypeError(`Datastar attribute ${JSON.stringify(name)} does not accept modifiers`)
    }

    const suffixes = renderDatastarModifierSuffixes(target, name, value.modifiers)
    return {
      name: suffixes.length === 0 ? name : `${name}__${suffixes.join("__")}`,
      value: normalizeDatastarValue(resolved, value.value)
    }
  }

  return { name, value: normalizeDatastarValue(resolved, value) }
}
