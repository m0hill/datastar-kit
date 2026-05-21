# Actions and responses

Actions are HTTP routes triggered by Datastar attributes. Commands are actions that mutate backend state. Query actions and live streams read current backend state and patch the UI.

## Default command flow

1. Render HTML with a Datastar action attribute such as `data-on:click="@post('/increment')"`.
2. Decode Datastar signals with `read.signals(request)`, validate with `read.signals(request, schema)` when needed, or use Web APIs directly for non-Datastar query/body/form inputs.
3. Check security/session/CSRF requirements in app code.
4. Mutate backend state through app-owned services/resources.
5. Return `reply.done()` for no immediate UI feedback, or return a Datastar patch/stream through `reply.*`.

## Response helpers

Use `reply` helpers:

- `reply.page(...)` — full HTML page/document response with ordinary HTTP status semantics.
- `reply.patch(...)` — default SSE element patch response.
- `reply.signals(...)` — default SSE signal patch response.
- `reply.stream(...)` — multiple events or long-lived SSE streams, usually from `event.patch(...)` / `event.signals(...)` chunks.
- `reply.done(...)` — successful command with no body (`204`).
- `reply.navigate(...)` — safe Datastar-driven navigation.
- `reply.directHtml(...)`, `reply.directSignals(...)`, and `reply.directScript(...)` — explicit Datastar direct-response escape hatches.

Datastar action helpers own their protocol status codes. Keep Datastar protocol options separate from native response options:

```tsx
reply.patch(<Count />, {}, { headers: { 'x-action': 'increment' } })
reply.signals({ saving: false }, { onlyIfMissing: true }, { headers: { 'x-action': 'save' } })
```

## Status semantics

Current Datastar fetch actions process response bodies as patches when the HTTP status is `200`. They treat `204` as success with no body.

Use this policy:

- **`200` with a body** — Datastar may process SSE, HTML, JSON signal, or JavaScript direct responses.
- **`204` without a body** — the command succeeded and there is no browser patch to apply.
- **Other statuses** — use normal HTTP semantics for errors, redirects, and API responses.

`reply.page(...)` is normal HTTP and may use page-level statuses such as `404`.

## Patch targets and stable IDs

For ordinary component updates, the element `id` is the patch contract. Render a stable `id` on each top-level element you return, then omit `selector`. Datastar matches those IDs in the browser and updates the existing elements in the default `outer` patch mode:

```tsx
const Count = () => <output id="count">{count}</output>

reply.patch(<Count />)
event.patch(<Count />)
```

This is the preferred shape for component replacement, live streams, and reconnect-safe current-state rendering. The initial page and later patches should render the same stable IDs for the same UI regions. Do not generate a fresh ID on every render.

Pass `selector` when the patch targets a container or CSS match instead of the returned element itself, such as appending or prepending list items, removing elements, patching `inner` HTML, or updating multiple targets:

```tsx
reply.patch(<TodoItem todo={todo} />, { selector: '#todos', mode: 'append' })
event.patch('', { selector: '.toast', mode: 'remove' })
```

For a visual walkthrough of every element patch mode, see [Patch elements](patch-elements.md).

For repeated items, use stable item IDs when those items may be patched individually:

```tsx
const TodoItem = (props: { todo: Todo }) => (
  <li id={`todo-${props.todo.id}`}>{props.todo.title}</li>
)
```

## State rule

Commands may read sparse browser signals, while durable state belongs in backend resources. For trusted values such as counters, read the current value from the server, mutate it there, and patch the rendered view.

## Forms and other request bodies

Structured `ds.get`, `ds.post`, `ds.put`, `ds.patch`, and `ds.delete` actions use Datastar's default JSON signal transport. Datastar signals and form data are distinct request inputs. Use signals for sparse browser state sent by Datastar actions; use Web APIs or framework facilities for ordinary form posts, file uploads, and non-Datastar HTTP endpoints.

For Datastar's form transport, pass `contentType: 'form'` in the fetch action options and read that request with your platform's form/multipart APIs.

Next: [Patch elements](patch-elements.md). Related: [Signals](signals.md), [Realtime streams](realtime.md).
