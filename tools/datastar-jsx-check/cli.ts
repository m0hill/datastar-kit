import { existsSync, readdirSync } from "node:fs"
import path from "node:path"
import ts from "typescript"
import { checkProgram, type DatastarJsxDiagnostic } from "./check.js"
import { loadProject } from "./load-project.js"

// Every TypeScript project in the repo, so a new example is checked without being listed here.
const defaultProjectPaths = ["packages", "examples"]
  .flatMap((folder) => readdirSync(folder).map((name) => path.join(folder, name, "tsconfig.json")))
  .filter((projectPath) => existsSync(projectPath))
  .toSorted()

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
