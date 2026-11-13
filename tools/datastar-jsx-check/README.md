# Datastar JSX checker

Private workspace checker for JSX mistakes that TypeScript deliberately permits, especially unknown
attribute names containing hyphens, and element nesting that the browser's HTML parser rewrites.

```sh
pnpm check:jsx-attributes
```

The default CLI run checks all TypeScript projects under `packages/` and `examples/`; the root
`pnpm typecheck` command runs it after ordinary TypeScript checks. Pass explicit tsconfig paths to
check a selected project.

## Module shape

- `check.ts` is the functional core: `checkProgram(program)` returns structured diagnostics.
- `html-nesting.ts` holds the nesting rules: a `<div>` in a `<p>`, nested `<a>`, `<form>`, `<button>`,
  or `<li>`, and table rows or text outside the elements a table allows. Each is a case where the
  parser changes the tree, so the DOM no longer matches the server's HTML and Datastar patches can
  morph the wrong elements. Nesting the parser keeps as written is not reported.
- `load-project.ts` adapts a tsconfig into a TypeScript `Program`.
- `cli.ts` owns workspace defaults, diagnostic rendering, and the process exit code.
- `fixtures/` and `check.test.ts` cover registrations, path mappings, runtime-safe direct and spread
  attributes, primitive datasets, typo suggestions, keys, modifier compatibility, unregistered custom-element references, and locations.

The checker uses TypeScript's contextual JSX types, so module-augmented `CustomJsxAttributes` and
`CustomJsxElements` are the registration seam. It also rejects rich non-`data-*` values that the
server renderer cannot serialize. Canonical Datastar names, keys, typo suggestions, and modifier
compatibility come through the same attribute-authoring module used by the JSX runtime and HTML
renderer. Modifier value-tag grammar is deferred until the runtime and checker can share one parser
instead of maintaining parallel rules.

The checker requires custom elements to be registered through `CustomJsxElements` before they use
`data-ref`; otherwise their loose JSX props cannot prove that the signal accepts the element value.

This remains workspace-private until its CLI, configuration, TypeScript compatibility, project
loading, performance, and diagnostic contracts are stable enough to publish.
