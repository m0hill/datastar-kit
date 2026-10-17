import type { StandardSchemaV1 } from "./standard-schema.js"

export type FieldErrorShape = { readonly [key: string]: string | FieldErrorShape }

export type FieldErrors<T extends FieldErrorShape> = {
  readonly [Key in keyof T]: T[Key] extends FieldErrorShape ? FieldErrors<T[Key]> : string
}

const pathKey = (path: StandardSchemaV1.Issue["path"]): string =>
  (path ?? [])
    .map((segment) => String(typeof segment === "object" ? segment.key : segment))
    .join(".")

export const fieldErrors = <T extends FieldErrorShape>(
  fields: T,
  issues: ReadonlyArray<StandardSchemaV1.Issue>
): FieldErrors<T> => {
  const messages = new Map<string, string>()
  for (const issue of issues) {
    const key = pathKey(issue.path)
    if (!messages.has(key)) messages.set(key, issue.message)
  }

  const build = (shape: FieldErrorShape, prefix: string): Record<string, unknown> => {
    const errors: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(shape)) {
      const path = prefix.length === 0 ? key : `${prefix}.${key}`
      errors[key] = typeof value === "string" ? (messages.get(path) ?? "") : build(value, path)
    }
    return errors
  }

  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- build() mirrors every key of fields.
  return build(fields, "") as FieldErrors<T>
}
