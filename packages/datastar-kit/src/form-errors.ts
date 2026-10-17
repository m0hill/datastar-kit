import type { StandardSchemaV1 } from "./standard-schema.js"

/** Field error messages keyed like the signal state that displays them. */
export type FieldErrorShape = { readonly [key: string]: string | FieldErrorShape }

/** Field error messages with the same keys as `T`. */
export type FieldErrors<T extends FieldErrorShape> = {
  readonly [Key in keyof T]: T[Key] extends FieldErrorShape ? FieldErrors<T[Key]> : string
}

const pathKey = (path: StandardSchemaV1.Issue["path"]): string =>
  (path ?? [])
    .map((segment) => String(typeof segment === "object" ? segment.key : segment))
    .join(".")

/**
 * Maps validation issues onto a field error object for a signal patch.
 *
 * @remarks
 * Every field in `fields` is included: it receives the message of the first issue whose path
 * matches it, or `""` when it has none, so the patch also clears errors that are now resolved.
 * Issues for paths outside `fields` are ignored.
 *
 * @param fields Field error defaults, usually `state(...).defaults.errors`.
 * @param issues Issues from `read.validate(...)` or any Standard Schema validator.
 * @returns Field error messages shaped like `fields`.
 */
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
