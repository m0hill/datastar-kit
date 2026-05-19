# HTML rendering

The built-in HTML layer is intentionally tiny. It provides HTML nodes, escaping, fragments, raw trusted HTML, prop merging, full-page string rendering, and the backing model for the blessed JSX runtime.

```tsx
import { ds, render } from "ts-star"

const view = <button type="button" {...ds.on("click", ds.post("/save"))}>Save</button>
const html = render(view)
```

Strings are escaped by default. Use `raw(renderedHtml)` only for trusted HTML from another renderer.

Use `jsx: "react-jsx"` with `jsxImportSource: "ts-star"` for first-class TSX. The lower-level `h(...)` API and classic `ts-star/jsx` factory remain available for tests, codegen, and non-JSX users; neither is a browser component runtime.
