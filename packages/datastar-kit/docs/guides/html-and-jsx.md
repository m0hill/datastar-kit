# HTML and JSX

Datastar Kit renders HTML on the server. The built-in HTML layer is intentionally tiny: HTML nodes, escaping, explicit unsafe HTML, prop merging, fragment rendering through child arrays, and the backing model for the JSX runtime.

## JSX setup

Use TypeScript's automatic JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "datastar-kit"
  }
}
```

Then write server-side view functions:

```tsx
import { ds, renderToString } from 'datastar-kit'

const view = <button type="button" {...ds.on('click', ds.post('/save'))}>Save</button>
const html = renderToString(view)
```

JSX here is a server rendering convenience, not a browser component lifecycle or virtual DOM runtime.

## Escaping and trust boundaries

Text and attribute values are escaped by default. Use `unsafeHtml(renderedHtml)` only for HTML that has already crossed your app's trust boundary, such as sanitized output or trusted renderer output.

```tsx
import { unsafeHtml } from 'datastar-kit'

const trusted = unsafeHtml('<strong>Already sanitized</strong>')
```

## Low-level HTML helpers

JSX is the primary authoring path. Low-level helpers are useful for tests, code generation, and non-JSX environments:

```ts
import { ds, h, mergeProps, renderToString } from 'datastar-kit'

const view = h(
  'button',
  mergeProps({ type: 'button' }, ds.on('click', ds.post('/save'))),
  'Save'
)

const html = renderToString(view)
```

## Pages and patches

Use views with `reply.page(...)` for full documents and `reply.patch(...)` for Datastar updates:

```tsx
return reply.page(<Counter />, {
  head: <script type="module" src={DATASTAR_CDN} />
})

return reply.patch(<Count />)
```

Next: [Signals](signals.md). Related: [Actions and responses](actions-and-responses.md), [Security](security.md).
