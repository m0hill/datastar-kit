# Datastar JSX checker

Private workspace checker for JSX mistakes that TypeScript deliberately permits, especially unknown
attribute names containing hyphens.

```sh
pnpm check:jsx-attributes
```

The default CLI run checks all TypeScript projects under `packages/` and `examples/`. Pass explicit
tsconfig paths to check a selected project.

## Module shape

- `check.ts` is the functional core: `checkProgram(program)` returns structured diagnostics.
- `load-project.ts` adapts a tsconfig into a TypeScript `Program`.
- `cli.ts` owns workspace defaults, diagnostic rendering, and the process exit code.
- `fixtures/` and `check.test.ts` cover registrations, path mappings, primitive dataset values,
  typo suggestions, keys, modifier names and compatibility, and source locations.

The checker uses TypeScript's contextual JSX types, so module-augmented `CustomJsxAttributes` and
`CustomJsxElements` are the registration seam. Canonical Datastar names and modifier compatibility
come from the same metadata modules used by the JSX runtime. Modifier value-tag grammar is deferred
until the runtime and checker can share one parser instead of maintaining parallel rules.

This remains workspace-private until its CLI, configuration, TypeScript compatibility, project
loading, performance, and diagnostic contracts are stable enough to publish.
