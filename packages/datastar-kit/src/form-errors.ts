import type { StandardSchemaV1 } from "./standard-schema.js"

export type FieldErrorShape = { readonly [key: string]: string | FieldErrorShape }

export type FieldErrors<T extends FieldErrorShape> = {
  readonly [Key in keyof T]: T[Key] extends FieldErrorShape ? FieldErrors<T[Key]> : string
}

const pathKey = (path: StandardSchemaV1.Issue["path"]): string =>
  (path ?? [])
    .map((segment) => String(typeof segment === "object" ? segment.key : segment))
    .join(".")

export interface FieldErrorsResult<T extends FieldErrorShape> {
  readonly errors: FieldErrors<T>
  readonly unmatched: ReadonlyArray<StandardSchemaV1.Issue>
}

export const fieldErrors = <T extends FieldErrorShape>(
  fields: T,
  issues: ReadonlyArray<StandardSchemaV1.Issue>
): FieldErrorsResult<T> => {
  const messages = new Map<string, string>()
  for (const issue of issues) {
    const key = pathKey(issue.path)
    if (!messages.has(key)) messages.set(key, issue.message)
  }

  const fieldPaths = new Set<string>()
  const build = (shape: FieldErrorShape, prefix: string): Record<string, unknown> => {
    const errors: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(shape)) {
      const path = prefix.length === 0 ? key : `${prefix}.${key}`
      if (typeof value === "string") {
        fieldPaths.add(path)
        errors[key] = messages.get(path) ?? ""
      } else {
        errors[key] = build(value, path)
      }
    }
    return errors
  }

  return {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- build() mirrors every key of fields.
    errors: build(fields, "") as FieldErrors<T>,
    unmatched: issues.filter((issue) => !fieldPaths.has(pathKey(issue.path)))
  }
}
