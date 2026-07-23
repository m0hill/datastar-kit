import ts from "typescript"
import {
  datastarAttributeDefinitions,
  datastarAttributeRoot,
  datastarModifierTarget,
  resolveDatastarAttributeRoot
} from "../../packages/datastar-kit/src/ds/attribute-metadata.js"
import {
  datastarModifierKeyForSuffix,
  isDatastarModifierCompatible
} from "../../packages/datastar-kit/src/ds/modifier-rendering.js"

/** Stable diagnostic identifiers produced by the Datastar JSX checker. */
export type DatastarJsxDiagnosticCode =
  | "unknown-aria-attribute"
  | "unknown-datastar-attribute"
  | "invalid-datastar-key"
  | "invalid-datastar-modifier"
  | "unsupported-rich-attribute"
  | "unregistered-rich-data-attribute"
  | "unregistered-custom-element-ref"
  | "unknown-vendor-attribute"

/** A source-anchored Datastar JSX checker diagnostic. */
export interface DatastarJsxDiagnostic {
  readonly code: DatastarJsxDiagnosticCode
  readonly file: string
  readonly start: number
  readonly length: number
  readonly message: string
  readonly suggestion?: string
}

type CheckedAttribute = {
  readonly nameNode: ts.Node
  readonly name: string
  readonly value: ts.Expression | undefined
  readonly valueType?: ts.Type
  readonly primitiveLiteral: boolean
}

const primitiveTypeFlags =
  ts.TypeFlags.StringLike |
  ts.TypeFlags.NumberLike |
  ts.TypeFlags.BooleanLike |
  ts.TypeFlags.Null |
  ts.TypeFlags.Undefined |
  ts.TypeFlags.Never

const isPrimitiveType = (checker: ts.TypeChecker, type: ts.Type): boolean => {
  if (type.isUnion()) return type.types.every((member) => isPrimitiveType(checker, member))
  if (type.isIntersection()) return type.types.some((member) => isPrimitiveType(checker, member))
  if ((type.flags & primitiveTypeFlags) !== 0) return true
  if ((type.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) !== 0) return false

  const constraint = checker.getBaseConstraintOfType(type)
  return constraint !== undefined && constraint !== type && isPrimitiveType(checker, constraint)
}

const isPrimitiveAttributeValue = (
  checker: ts.TypeChecker,
  attribute: CheckedAttribute
): boolean => {
  if (attribute.primitiveLiteral) return true
  if (attribute.valueType !== undefined) return isPrimitiveType(checker, attribute.valueType)
  return (
    attribute.value === undefined ||
    isPrimitiveType(checker, checker.getTypeAtLocation(attribute.value))
  )
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

const closestName = (name: string, candidates: readonly string[]): string | undefined => {
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

const diagnostic = (
  sourceFile: ts.SourceFile,
  attribute: CheckedAttribute,
  code: DatastarJsxDiagnosticCode,
  message: string,
  suggestion?: string
): DatastarJsxDiagnostic => {
  const start = attribute.nameNode.getStart(sourceFile)
  return {
    code,
    file: sourceFile.fileName,
    start,
    length: attribute.nameNode.getWidth(sourceFile),
    message,
    ...(suggestion === undefined ? {} : { suggestion })
  }
}

const checkModifiers = (
  sourceFile: ts.SourceFile,
  attribute: CheckedAttribute,
  name: string
): DatastarJsxDiagnostic | undefined => {
  const [, ...modifiers] = name.split("__")
  if (modifiers.length === 0) return undefined

  const target = datastarModifierTarget(name)
  if (target === undefined) {
    return diagnostic(
      sourceFile,
      attribute,
      "invalid-datastar-modifier",
      `${JSON.stringify(datastarAttributeRoot(name))} does not accept modifiers`
    )
  }

  for (const modifier of modifiers) {
    const [suffix = ""] = modifier.split(".")
    const key = datastarModifierKeyForSuffix(suffix)
    if (key === undefined) {
      return diagnostic(
        sourceFile,
        attribute,
        "invalid-datastar-modifier",
        `Unknown Datastar modifier ${JSON.stringify(suffix)}`
      )
    }
    if (!isDatastarModifierCompatible(target, key)) {
      return diagnostic(
        sourceFile,
        attribute,
        "invalid-datastar-modifier",
        `Modifier ${JSON.stringify(suffix)} is not valid on ${JSON.stringify(datastarAttributeRoot(name))}`
      )
    }
  }

  return undefined
}

const checkKnownDatastarAttribute = (
  sourceFile: ts.SourceFile,
  attribute: CheckedAttribute,
  name: string
): DatastarJsxDiagnostic | undefined => {
  const root = datastarAttributeRoot(name)
  const resolved = resolveDatastarAttributeRoot(root)
  if (resolved === undefined) return undefined

  if (resolved.form === "exact" && resolved.definition.key === "required") {
    return diagnostic(
      sourceFile,
      attribute,
      "invalid-datastar-key",
      `${JSON.stringify(resolved.definition.name)} requires a key after ':'`
    )
  }
  if (resolved.form === "key" && resolved.definition.key === "forbidden") {
    return diagnostic(
      sourceFile,
      attribute,
      "invalid-datastar-key",
      `${JSON.stringify(resolved.definition.name)} does not accept a key`
    )
  }
  if (resolved.form === "key" && resolved.key.length === 0) {
    return diagnostic(
      sourceFile,
      attribute,
      "invalid-datastar-key",
      `${JSON.stringify(resolved.definition.name)} has an empty key`
    )
  }

  return checkModifiers(sourceFile, attribute, name)
}

const checkAttribute = (
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  propsType: ts.Type,
  attribute: CheckedAttribute,
  looseCustomElement: boolean
): DatastarJsxDiagnostic | undefined => {
  const { name } = attribute
  if (
    name !== "children" &&
    name !== "key" &&
    name !== "__self" &&
    name !== "__source" &&
    !name.startsWith("data-") &&
    !isPrimitiveAttributeValue(checker, attribute)
  ) {
    return diagnostic(
      sourceFile,
      attribute,
      "unsupported-rich-attribute",
      `Attribute ${JSON.stringify(name)} only accepts primitive values; expressions, arrays, and objects require a data-* attribute`
    )
  }
  if (!name.includes("-")) return undefined

  if (name.startsWith("aria-")) {
    if (propsType.getProperty(name) !== undefined) return undefined
    const suggestion = closestName(
      name,
      propsType
        .getProperties()
        .map((property) => property.name)
        .filter((propertyName) => propertyName.startsWith("aria-"))
    )
    return diagnostic(
      sourceFile,
      attribute,
      "unknown-aria-attribute",
      `Unknown ARIA attribute ${JSON.stringify(name)}`,
      suggestion
    )
  }

  if (name.startsWith("data-")) {
    const knownIssue = checkKnownDatastarAttribute(sourceFile, attribute, name)
    if (knownIssue !== undefined) return knownIssue

    const resolved = resolveDatastarAttributeRoot(datastarAttributeRoot(name))
    if (resolved !== undefined) {
      if (looseCustomElement && resolved.definition.name === "data-ref") {
        return diagnostic(
          sourceFile,
          attribute,
          "unregistered-custom-element-ref",
          'Attribute "data-ref" on an unregistered custom element requires registration in CustomJsxElements'
        )
      }
      return undefined
    }
    if (propsType.getProperty(name) !== undefined) return undefined

    const root = datastarAttributeRoot(name)
    const baseName = root.split(":", 1)[0] ?? root
    const suggestion = closestName(
      baseName,
      datastarAttributeDefinitions.map((definition) => definition.name)
    )
    if (suggestion !== undefined) {
      return diagnostic(
        sourceFile,
        attribute,
        "unknown-datastar-attribute",
        `Unknown Datastar attribute ${JSON.stringify(baseName)}`,
        suggestion
      )
    }

    if (isPrimitiveAttributeValue(checker, attribute)) return undefined
    return diagnostic(
      sourceFile,
      attribute,
      "unregistered-rich-data-attribute",
      `Rich custom data attribute ${JSON.stringify(name)} must be registered in CustomJsxAttributes`
    )
  }

  if (propsType.getProperty(name) !== undefined) return undefined
  if (looseCustomElement) return undefined
  if (checker.getIndexTypeOfType(propsType, ts.IndexKind.String) !== undefined) return undefined
  return diagnostic(
    sourceFile,
    attribute,
    "unknown-vendor-attribute",
    `Unknown vendor or custom attribute ${JSON.stringify(name)}; register it in CustomJsxAttributes`
  )
}

const checkedJsxAttribute = (
  sourceFile: ts.SourceFile,
  attribute: ts.JsxAttribute
): CheckedAttribute => {
  const initializer = attribute.initializer
  const value =
    initializer === undefined
      ? undefined
      : ts.isJsxExpression(initializer)
        ? initializer.expression
        : initializer
  return {
    nameNode: attribute.name,
    name: attribute.name.getText(sourceFile),
    value,
    primitiveLiteral: initializer === undefined || ts.isStringLiteral(initializer)
  }
}

const checkedSpreadAttributes = (
  checker: ts.TypeChecker,
  spread: ts.JsxSpreadAttribute
): readonly CheckedAttribute[] => {
  const propertyTypes = new Map<string, ts.Type>()

  const collectProperties = (type: ts.Type): void => {
    if (type.isUnion()) {
      for (const member of type.types) collectProperties(member)
      return
    }

    for (const property of checker.getPropertiesOfType(type)) {
      const propertyType = checker.getTypeOfSymbolAtLocation(property, spread.expression)
      const currentType = propertyTypes.get(property.name)
      if (
        currentType === undefined ||
        (isPrimitiveType(checker, currentType) && !isPrimitiveType(checker, propertyType))
      ) {
        propertyTypes.set(property.name, propertyType)
      }
    }

    for (const index of checker.getIndexInfosOfType(type)) {
      if (isPrimitiveType(checker, index.type)) continue
      const keyType = checker.typeToString(index.keyType)
      const name = keyType.startsWith("`data-") ? "data-<computed>" : "<computed attribute>"
      propertyTypes.set(name, index.type)
    }
  }

  collectProperties(checker.getTypeAtLocation(spread.expression))
  return [...propertyTypes].map(([name, valueType]) => ({
    nameNode: spread.expression,
    name,
    value: undefined,
    valueType,
    primitiveLiteral: false
  }))
}

const checkedAttributes = (
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile,
  attributes: ts.JsxAttributes
): readonly CheckedAttribute[] =>
  attributes.properties.flatMap((property) =>
    ts.isJsxAttribute(property)
      ? [checkedJsxAttribute(sourceFile, property)]
      : checkedSpreadAttributes(checker, property)
  )

const checkSourceFile = (
  checker: ts.TypeChecker,
  sourceFile: ts.SourceFile
): readonly DatastarJsxDiagnostic[] => {
  const diagnostics: DatastarJsxDiagnostic[] = []
  const intrinsicTags = checker.getJsxIntrinsicTagNamesAt(sourceFile)
  const intrinsicTagNames = new Set(intrinsicTags.map((tag) => tag.name))
  // Unregistered custom elements have an `unknown` contextual type. A div contributes only global
  // HTML, ARIA, Datastar, and registered custom attributes, so it is the namespace-checking base.
  const globalPropsSymbol = intrinsicTags.find((tag) => tag.name === "div")
  const globalPropsType =
    globalPropsSymbol === undefined
      ? undefined
      : checker.getTypeOfSymbolAtLocation(globalPropsSymbol, sourceFile)

  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const contextualPropsType = checker.getContextualType(node.attributes)
      const tagName = node.tagName.getText(sourceFile)
      const registeredIntrinsicElement = intrinsicTagNames.has(tagName)
      const looseCustomElement = tagName.includes("-") && !registeredIntrinsicElement
      const propsType =
        looseCustomElement && globalPropsType !== undefined ? globalPropsType : contextualPropsType

      if (
        (registeredIntrinsicElement || looseCustomElement) &&
        propsType !== undefined &&
        (propsType.flags & (ts.TypeFlags.Any | ts.TypeFlags.Unknown)) === 0
      ) {
        for (const attribute of checkedAttributes(checker, sourceFile, node.attributes)) {
          const issue = checkAttribute(
            checker,
            sourceFile,
            propsType,
            attribute,
            looseCustomElement
          )
          if (issue !== undefined) diagnostics.push(issue)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return diagnostics
}

/**
 * Checks root JSX source files in a TypeScript program for attribute mistakes TypeScript permits.
 *
 * Files imported only as dependencies are not checked; load each workspace tsconfig separately so
 * its module augmentations and compiler options form the checker context.
 *
 * @param program TypeScript program loaded from one project configuration.
 * @returns Structured source diagnostics sorted by file and position.
 */
export const checkProgram = (program: ts.Program): readonly DatastarJsxDiagnostic[] => {
  const checker = program.getTypeChecker()
  const rootFiles = new Set(program.getRootFileNames())
  const diagnostics = program
    .getSourceFiles()
    .filter(
      (sourceFile) =>
        rootFiles.has(sourceFile.fileName) &&
        !sourceFile.isDeclarationFile &&
        sourceFile.languageVariant === ts.LanguageVariant.JSX
    )
    .flatMap((sourceFile) => checkSourceFile(checker, sourceFile))

  return diagnostics.toSorted((left, right) =>
    left.file === right.file ? left.start - right.start : left.file.localeCompare(right.file)
  )
}
