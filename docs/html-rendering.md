# HTML rendering

The built-in HTML layer is intentionally tiny. It provides HTML nodes, escaping, fragments, raw trusted HTML, prop merging, and full-page string rendering.

```ts
import { h, props, render } from "ts-star"

const view = h("button", props({ type: "button" }), "Save")
const html = render(view)
```

Strings are escaped by default. Use `raw(renderedHtml)` only for trusted HTML from another renderer.

JSX is available through the explicit `ts-star/jsx` subpath. It is a server-rendering convenience, not a component runtime.
