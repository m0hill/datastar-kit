import path from "node:path"
import ts from "typescript"
import { checkProgram, type DatastarJsxDiagnostic } from "./check.js"
import { loadProject } from "./load-project.js"

const defaultProjectPaths = [
  "packages/datastar-kit/tsconfig.json",
  "packages/website/tsconfig.json",
  "examples/elysia-layout/tsconfig.json",
  "examples/hono-counter/tsconfig.json",
  "examples/hono-custom-actions/tsconfig.json",
  "examples/hono-form-validation/tsconfig.json",
  "examples/hono-linear-clone/tsconfig.json",
  "examples/hono-live-counter/tsconfig.json",
  "examples/hono-live-counter-redis/tsconfig.json",
  "examples/hono-modal/tsconfig.json",
  "examples/hono-official-examples/tsconfig.json",
  "examples/hono-todos/tsconfig.json",
  "examples/syntax-check/tsconfig.json",
  "examples/worker-do-hono-live-todos/tsconfig.json",
  "examples/worker-hono-counter/tsconfig.json",
  "examples/worker-hono-live-todos/tsconfig.json"
] as const

const formatDiagnostic = (diagnostic: DatastarJsxDiagnostic): string => {
  const source = ts.sys.readFile(diagnostic.file)
  const sourceFile =
    source === undefined
      ? undefined
      : ts.createSourceFile(diagnostic.file, source, ts.ScriptTarget.Latest, false)
  const location = sourceFile?.getLineAndCharacterOfPosition(diagnostic.start)
  const relativeFile = path.relative(process.cwd(), diagnostic.file)
  const position = location === undefined ? "" : `:${location.line + 1}:${location.character + 1}`
  const suggestion =
    diagnostic.suggestion === undefined
      ? ""
      : ` Did you mean ${JSON.stringify(diagnostic.suggestion)}?`
  return `${relativeFile}${position} - error ${diagnostic.code}: ${diagnostic.message}.${suggestion}`
}

const run = (projectPaths: readonly string[]): number => {
  const diagnostics: DatastarJsxDiagnostic[] = []
  let loadFailed = false

  for (const projectPath of projectPaths) {
    const result = loadProject(projectPath)
    if (result._tag === "invalid") {
      loadFailed = true
      process.stderr.write(
        ts.formatDiagnosticsWithColorAndContext(result.diagnostics, {
          getCanonicalFileName: (fileName) => fileName,
          getCurrentDirectory: () => ts.sys.getCurrentDirectory(),
          getNewLine: () => ts.sys.newLine
        })
      )
      continue
    }

    diagnostics.push(...checkProgram(result.project.program))
  }

  for (const item of diagnostics) process.stderr.write(`${formatDiagnostic(item)}\n`)
  if (!loadFailed && diagnostics.length === 0) {
    process.stdout.write(`Datastar JSX check passed for ${projectPaths.length} projects.\n`)
  }

  return loadFailed || diagnostics.length > 0 ? 1 : 0
}

const args = process.argv.slice(2)
process.exitCode = run(args.length === 0 ? defaultProjectPaths : args)
