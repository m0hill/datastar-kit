# HTML rendering

The built-in HTML layer is intentionally tiny. It provides HTML nodes, escaping, explicit unsafe HTML, prop merging, fragment rendering through child arrays, and the backing model for the blessed JSX runtime.

```tsx
import { ds, renderToString } from "datastar-kit"

const view = <button type="button" {...ds.on("click", ds.post("/save"))}>Save</button>
const html = renderToString(view)
```

Strings are escaped by default. Use `unsafeHtml(renderedHtml)` only for HTML that has already crossed your app's trust boundary.

Use `jsx: "react-jsx"` with `jsxImportSource: "datastar-kit"` for first-class TSX. The lower-level `h(...)` API remains available for tests, codegen, and the one non-JSX reference example; neither path is a browser component runtime.
