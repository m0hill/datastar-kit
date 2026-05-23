import { reply } from "datastar-kit"
import { appSignals, authSignals } from "../features/validation.js"
import { appState, authState } from "../ui/state.js"

export const authErrorPatch = (errors: Partial<typeof authSignals.errors>) =>
  reply.signals(authState.patch({ errors: { ...authSignals.errors, ...errors } }))

export const appErrorPatch = (errors: Partial<typeof appSignals.errors>) =>
  reply.signals(appState.patch({ errors: { ...appSignals.errors, ...errors } }))

export const firstErrors = (errors: Record<string, string[] | undefined>) => ({
  field: (name: string) => errors[name]?.[0] ?? ""
})

export const isUniqueConstraintError = (error: unknown) =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  typeof error.code === "string" &&
  error.code.includes("CONSTRAINT")
