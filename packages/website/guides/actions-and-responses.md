# Actions and responses

Datastar actions turn browser events into HTTP requests. Datastar Kit helps you author those action expressions and return responses that Datastar can apply.

## Author actions in TSX

Use `ds.on(...)` with a fetch action such as `ds.get(...)` or `ds.post(...)`:

```tsx
import { ds } from "datastar-kit"
;<button type="button" {...ds.on("click", ds.post("/todos/add"))}>
  Add todo
</button>
```

The helper renders Datastar attributes such as:

```html
<button data-on:click="@post('/todos/add')">Add todo</button>
```

Build reactive URLs with `ds.queryUrl(...)`:

```tsx
const search = ds.state({ q: "" })

<input
  type="search"
  {...ds.bind(search.$.q)}
  {...ds.on("input", ds.get(ds.queryUrl("/todos/search", { q: search.$.q })))}
/>
```

## Command handlers

A command receives user intent and may mutate backend resources:

```ts
import { read, reply } from "datastar-kit"

export async function addTodo(request: Request): Promise<Response> {
  const user = await requireUser(request)
  const input = TodoSchema.parse(await read.signals(request))

  await todos.create({ ownerId: user.id, title: input.title })

  return reply.done()
}
```

Use this order:

1. Decode the request input.
2. Validate shape and domain rules.
3. Check session, authorization, CSRF, and rate-limit policy.
4. Read or mutate backend resources.
5. Return a Datastar response or a normal HTTP response.

## Choose a response

| Response              | Use it when                                                        |
| --------------------- | ------------------------------------------------------------------ |
| `reply.page(...)`     | Rendering a full HTML document.                                    |
| `reply.done()`        | A command succeeded and the page does not need an immediate patch. |
| `reply.patch(...)`    | Returning server-rendered HTML for a page region.                  |
| `reply.signals(...)`  | Updating small browser-side signal state.                          |
| `reply.stream(...)`   | Sending one or more SSE events, including long-lived live views.   |
| `reply.navigate(...)` | Navigating the browser from a Datastar response.                   |

`reply.patch(...)`, `reply.signals(...)`, and `reply.stream(...)` return `200` SSE responses. `reply.done()` returns `204` with no body. Datastar fetch actions process patch bodies on `200` and treat `204` as successful completion.

`reply.page(...)` is normal HTTP and can use page-level statuses:

```tsx
return reply.page(<NotFoundPage />, { title: "Not found" }, { status: 404 })
```

## Patch after a command

Return a focused patch when the command should update the current view immediately:

```tsx
export async function toggleTodo(request: Request, id: string): Promise<Response> {
  const user = await requireUser(request)
  const todo = await todos.toggle({ id, ownerId: user.id })

  return reply.patch(<TodoItem todo={todo} />)
}
```

For the common case, the returned element carries the stable `id` Datastar should patch. Use selectors and patch modes for container operations such as append, prepend, inner replacement, or removal. See [element patches](patch-elements.md).

## Stream multiple events

Use `event.*` helpers when a response needs more than one Datastar event:

```tsx
import { event, reply } from "datastar-kit"

return reply.stream([event.signals(form.reset()), event.patch(<IssueDetails issue={issue} />)])
```

`event.navigate(...)` is the composable version of `reply.navigate(...)` when a stream should end by moving the browser to another URL.

## Direct responses

Datastar also supports direct-response headers. Datastar Kit exposes them as:

- `reply.directHtml(...)`
- `reply.directSignals(...)`
- `reply.directScript(...)`

Prefer the SSE helpers unless an integration specifically requires direct-response handling. `reply.directScript(...)` executes trusted JavaScript in the browser; use structured patches or `reply.navigate(...)` when possible.

## Forms and request bodies

Structured `ds.get`, `ds.post`, `ds.put`, `ds.patch`, and `ds.delete` actions use Datastar's default JSON signal transport.

For Datastar's form transport, pass `contentType: "form"` in the fetch action options and read the request with your platform's form or multipart APIs:

```tsx
<form
  {...ds.on("submit", ds.post("/upload", { contentType: "form", selector: null }), {
    prevent: true
  })}
>
  <input type="file" name="avatar" />
  <button>Upload</button>
</form>
```

`selector: null` tells Datastar to submit the closest form.

## Custom browser actions and plugins

Inline Datastar expressions are fine for small behavior. When browser-only behavior needs DOM APIs, branching, or comments, register a Datastar action or plugin in a browser module and call it from TSX with `ds.action(...)` or `ds.pluginAttr(...)`:

```tsx
const modalOpen = ds.signal<boolean>("modalOpen")

<button {...ds.on("click", ds.action("setSignal", "modalOpen", true))}>Open</button>
<dialog {...ds.effect(ds.action("syncDialog", modalOpen))} />
<button {...ds.pluginAttr("focus-when", modalOpen)}>Cancel</button>
<div {...ds.pluginAttr("match-media:is-dark", "prefers-color-scheme: dark")} />
```

See `examples/hono-custom-actions` for a complete example.

Next: [Element patches](patch-elements.md).
