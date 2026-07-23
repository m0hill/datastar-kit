import path from "node:path"
import ts from "typescript"

/** Successfully loaded TypeScript project and its normalized configuration path. */
export interface LoadedProject {
  readonly configPath: string
  readonly program: ts.Program
}

/** Result of loading a TypeScript project for Datastar JSX checking. */
export type LoadProjectResult =
  | { readonly _tag: "loaded"; readonly project: LoadedProject }
  | { readonly _tag: "invalid"; readonly diagnostics: readonly ts.Diagnostic[] }

/**
 * Loads one tsconfig and creates the TypeScript program used by the checker core.
 *
 * @param configPath Path to a TypeScript project configuration.
 * @returns A loaded program or TypeScript configuration diagnostics.
 */
export const loadProject = (configPath: string): LoadProjectResult => {
  const resolvedConfigPath = path.resolve(configPath)
  const diagnostics: ts.Diagnostic[] = []
  const parsed = ts.getParsedCommandLineOfConfigFile(
    resolvedConfigPath,
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic(diagnostic) {
        diagnostics.push(diagnostic)
      }
    }
  )

  if (parsed === undefined || diagnostics.length > 0) {
    return { _tag: "invalid", diagnostics }
  }
  if (parsed.errors.length > 0) {
    return { _tag: "invalid", diagnostics: parsed.errors }
  }

  return {
    _tag: "loaded",
    project: {
      configPath: resolvedConfigPath,
      program: ts.createProgram({
        rootNames: parsed.fileNames,
        options: parsed.options,
        ...(parsed.projectReferences === undefined
          ? {}
          : { projectReferences: parsed.projectReferences })
      })
    }
  }
}
