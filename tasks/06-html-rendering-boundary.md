# T006 — Define the HTML and templating boundary

## Status

`done`

## Why this task exists

`src/html.ts` is intentionally tiny. That is good for experimentation, but framework users will eventually need a stable story for templating.

Datastar encourages backend templating. The framework should not make the tiny internal builder a permanent constraint unless that is a deliberate decision.

There is also a Datastar-specific issue: attribute order can matter because Datastar evaluates attributes in DOM order. Plain object attributes obscure that semantic detail.

## Target outcome

Define a rendering boundary that supports:

- the current tiny builder;
- JSX as optional syntax;
- external renderers/templates later;
- safe escaping by default;
- explicit raw HTML escape hatches;
- correct Datastar attribute ordering where it matters.

## Required decisions

### 1. Renderer interface

Create an interface roughly like:

```ts
interface HtmlRenderer<Node> {
  render(node: Node): string
}
```

Framework core should depend on this boundary, not directly on one builder.

### 2. Attribute representation

Current `Attributes = Record<string, value>` is convenient but hides order.

Options:

- keep records but document order-sensitive helpers;
- introduce ordered attribute arrays internally;
- add `attrs(...)` builder that preserves order;
- keep `mergeAttrs` but provide `mergeAttrsStrict` and ordered alternatives.

### 3. Safe vs raw HTML

The framework should distinguish:

- escaped text;
- trusted raw HTML;
- rendered nodes.

Raw HTML should be explicit and visually obvious.

### 4. JSX status

Decide whether `src/jsx.ts` is:

- experimental convenience;
- primary authoring style;
- deprecated in favor of external renderers.

Do not let JSX pull the framework into React-like component semantics.

## Implementation work

- Define renderer interface.
- Adapt existing `html.ts` to that interface.
- Decide and test attribute ordering behavior.
- Add docs explaining where IDs are required for morph-by-id.
- Add helpers to encourage top-level IDs in patchable elements.
- Add raw HTML helper only if needed and document security implications.

## Acceptance criteria

- Framework runtime can render through an abstraction.
- Existing examples still work.
- Attribute order-sensitive cases are documented and tested.
- Raw HTML is not silently accepted as safe user content.
- JSX remains thin and does not become a hidden component runtime.

## Anti-goals

- Do not build a full template language.
- Do not add a virtual DOM.
- Do not make HTML generation depend on Datastar internally except at attribute/helper boundaries.
