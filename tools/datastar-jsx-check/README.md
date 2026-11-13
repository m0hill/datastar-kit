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

## Diagnostics

Each diagnostic prints its code, a fix, and a link to its entry here:

```text
src/page.tsx:12:10 - error unknown-datastar-attribute: Unknown Datastar attribute "data-shwo". Did you mean "data-show"?
  fix: Correct the name, or register a Datastar plugin attribute in CustomJsxAttributes.
  docs: tools/datastar-jsx-check/README.md#unknown-datastar-attribute
```

### `unknown-aria-attribute`

The `aria-*` name is not a WAI-ARIA attribute, so assistive technology ignores it.

```tsx
<button aria-labl="Close" />  // before
<button aria-label="Close" /> // after
```

### `unknown-datastar-attribute`

The `data-*` name is close to a Datastar attribute but is not one, so Datastar ignores it.

```tsx
<div data-shwo={open} /> // before
<div data-show={open} /> // after
```

A Datastar plugin attribute is registered in `CustomJsxAttributes` instead:

```tsx
declare module "datastar-kit/jsx-runtime" {
  interface CustomJsxAttributes {
    "data-focus-when"?: Expr<boolean>
  }
}
```

### `invalid-datastar-key`

The attribute's `:key` part does not match what Datastar expects: a missing key, a key on an
attribute that takes none, or an empty key.

```tsx
<button data-on={post("/save")} />       // before: data-on needs an event
<button data-on:click={post("/save")} /> // after

<div data-show:panel={open} />           // before: data-show takes no key
<div data-show={open} />                 // after
```

### `invalid-datastar-modifier`

A handwritten `__modifier` suffix is unknown, or the attribute does not accept it.

```tsx
<form data-on:submit__prevnt={post("/save")} />                 // before
<form data-on:submit={mod(post("/save"), { prevent: true })} /> // after
```

### `unsupported-rich-attribute`

A non-`data-*` attribute that TypeScript does not type, such as a prop on an unregistered custom
element, gets an object, array, or expression. The server renderer can only write strings, numbers,
and booleans there.

```tsx
<status-widget config={{ mode: "compact" }} /> // before
<status-widget config="compact" />             // after
```

### `unregistered-rich-data-attribute`

A custom `data-*` attribute gets an object, array, or expression, but no registration says how it
renders.

```tsx
<div data-config={{ mode: "compact" }} />  // before
<div data-config="compact" />              // after, as a primitive
```

Or register it with its value type in `CustomJsxAttributes`.

### `unregistered-custom-element-ref`

`data-ref` on an unregistered custom element cannot know the element's type, so the signal type is
unchecked.

```tsx
;<status-widget data-ref={widget} /> // before

declare module "datastar-kit/jsx-runtime" {
  interface CustomJsxElements {
    "status-widget": { mode: "compact" | "full" }
  }
}
;<status-widget data-ref={widget} /> // after
```

### `unknown-vendor-attribute`

A hyphenated attribute that is not `aria-*` or `data-*`, such as one used by another library, is not
registered.

```tsx
declare module "datastar-kit/jsx-runtime" {
  interface CustomJsxAttributes {
    "hx-get"?: string
  }
}
;<div hx-get="/fragment" />
```

### `invalid-html-nesting`

The browser's HTML parser rewrites this nesting, so the DOM no longer matches the HTML the server
sent and Datastar patches can morph the wrong elements.

```tsx
<p><div>Saved</div></p>     // before: the parser closes the <p> before the <div>
<p><span>Saved</span></p>   // after

<table><tr><td /></tr></table>                // before: the parser inserts a <tbody>
<table><tbody><tr><td /></tr></tbody></table> // after
```
