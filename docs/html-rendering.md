# HTML rendering boundary

`ts-star` renders HTML on the server. The built-in HTML boundary is intentionally tiny and explicit:

```ts
import { ds, h, props, render } from "ts-star"

const view = h(
  "button",
  props({ type: "button" }, ds.on("click", ds.post("/save"))),
  "Save"
)

render(view)
```

## Canonical HTML API

Top-level helpers:

- `h(tag, props, ...children)` creates an `HtmlNode`.
- `props(...groups)` composes HTML props/attributes. Later groups override earlier groups.
- `fragment(...children)` creates sibling nodes.
- `raw(html)` inserts trusted raw HTML.
- `render(child)` renders a node/fragment/string to an HTML string.
- `page(options)` renders a full HTML document string.

Public types:

- `Child`
- `HtmlNode`
- `Props`
- `PropValue`

## Escaping and raw HTML

Text children are escaped by default:

```ts
render(h("p", {}, "<script>bad()</script>"))
// <p>&lt;script&gt;bad()&lt;/script&gt;</p>
```

Trusted raw HTML must be explicit with `raw(...)`:

```ts
render(h("p", {}, raw("<strong>trusted</strong>")))
// <p><strong>trusted</strong></p>
```

Do not pass user input to `raw`. It is an escape hatch for already-sanitized or framework-generated HTML.

Note: top-level `raw(...)` is for raw HTML. `ds.raw(...)` is the Datastar expression escape hatch.

## Prop composition

`ds.*` helpers return plain HTML props. Compose them with `props(...)`:

```ts
h(
  "main",
  props({ id: "counter" }, ds.dataSignals({ count: 0 }, { ifMissing: true })),
  h("output", ds.text(ds.signal<number, "count">("count")), "0")
)
```

There is no public ordered-attribute or strict-merge API. Normal JavaScript object insertion order plus explicit `props(...)` composition is the blessed path for now.

## Patchable roots

Datastar element patches are most robust when patchable roots have stable IDs or explicit selectors:

```ts
const count = (value: number) => h("output", { id: "count" }, value)
```

The framework does not expose a patchable-node helper. Prefer plain, visible IDs/selectors over another abstraction.

## JSX status

JSX/TSX is an experimental syntax adapter over the same server HTML tree. It is not part of the main framework identity and should be imported explicitly from the adapter/subpath.

It has no:

- client component lifecycle;
- hooks;
- virtual DOM;
- hydration model;
- client components.

Function components, if used, are plain server render functions returning `Child`/`HtmlNode`.

## External renderers

There is no public renderer adapter interface yet. If an application uses another template system, render it to a string and pass that string to `reply.page(...)`, `reply.patch(...)`, or `render(...)` boundaries as appropriate.
