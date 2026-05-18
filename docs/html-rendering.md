# HTML rendering boundary

`ts-star` renders HTML on the server, but the tiny `src/html.ts` builder is not meant to be the only possible templating system forever. The framework boundary is:

```ts
interface Renderer<Node = unknown> {
  readonly render: (node: Node) => string
}
```

`htmlRenderer` is the default renderer for the built-in `Child` tree. Runtime services can depend on renderer services instead of directly depending on the builder.

## Built-in builder status

`src/html.ts` remains a deliberately small builder:

- `h(tag, attrs, ...children)` creates an `HtmlNode`.
- `fragment(...children)` creates sibling nodes.
- `render(child)` renders with escaping by default.
- `htmlDocument(...)` renders a full document.

This is enough for examples and framework internals, but external renderers can be adapted by implementing the renderer boundary.

## JSX status

`src/jsx.ts` is an experimental convenience syntax over the same `HtmlNode` tree. It is not a React-like runtime:

- no client component lifecycle;
- no hooks;
- no virtual DOM;
- no hydration model;
- server functions are just functions returning HTML nodes/fragments.

JSX remains optional. The hyperscript builder and future external renderer adapters are equally valid.

## Escaping and raw HTML

Text children are escaped by default:

```ts
render(h("p", {}, "<script>bad()</script>"))
// <p>&lt;script&gt;bad()&lt;/script&gt;</p>
```

Trusted raw HTML must be explicit with `rawHtml(...)`:

```ts
render(h("p", {}, rawHtml("<strong>trusted</strong>")))
// <p><strong>trusted</strong></p>
```

Do not pass user input to `rawHtml`. It is an escape hatch for already-sanitized or framework-generated HTML.

## Attribute ordering policy

Datastar evaluates attributes in DOM order, so order-sensitive attributes should be written explicitly.

The normal record form remains convenient:

```ts
h("button", { type: "button", disabled: true }, "Save")
```

JavaScript preserves object insertion order for normal string keys, but object merging can obscure intent. When order matters, use ordered attributes:

```ts
h(
  "main",
  attrs(
    ["data-signals__ifmissing", '{"count": 0}'],
    ["data-computed:double", "() => $count * 2"],
    ["data-text", "$double"]
  )
)
```

Use `mergeOrderedAttrs(...)` when composing normal record helpers into a deliberate order:

```ts
h("button", mergeOrderedAttrs({ type: "button" }, on("click", post("/save"))))
```

`mergeAttrs` remains useful for order-insensitive composition. `mergeAttrsStrict` remains useful when duplicate keys should be rejected.

## Patchable IDs

Datastar element patches are most robust when patchable roots have stable IDs or explicit selectors.

Use `patchableNode(tag, id, attrs, ...children)` to put the ID first and make the intention clear, or call `requirePatchId(node)` in helpers/tests when a patchable view must have an ID. `requirePatchId` throws `MissingPatchIdError` when the node lacks a non-empty `id`.

## External renderers

Future adapters should provide a `Renderer<Node>` and keep these invariants:

- escaped text by default;
- raw HTML is explicit;
- Datastar attribute names and order can be preserved;
- server-rendered output is plain HTML strings;
- no hidden client-side component/runtime semantics.
