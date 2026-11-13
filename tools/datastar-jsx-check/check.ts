import ts from "typescript"
import { compilerProps } from "../../packages/datastar-kit/src/jsx.js"
import { closestName, inspectDatastarAttributeName } from "./attribute-name.js"

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
  readonly suggestion: string | undefined
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
    suggestion
  }
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
    !compilerProps.has(name) &&
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
    const inspection = inspectDatastarAttributeName(name)
    if (inspection._tag === "invalid") {
      return diagnostic(
        sourceFile,
        attribute,
        inspection.category === "key" ? "invalid-datastar-key" : "invalid-datastar-modifier",
        inspection.message
      )
    }
    if (inspection._tag === "known") {
      // data-ref is the only attribute whose type depends on the element (the ref's element type),
      // so it is the only one an unregistered custom element cannot type.
      if (looseCustomElement && inspection.name === "data-ref") {
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

    if (inspection.suggestion !== undefined) {
      return diagnostic(
        sourceFile,
        attribute,
        "unknown-datastar-attribute",
        `Unknown Datastar attribute ${JSON.stringify(inspection.baseName)}`,
        inspection.suggestion
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
