# Actions and responses

Actions are HTTP requests triggered by Datastar attributes. Some actions are commands that mutate backend resources. Others are queries or streams that read current state and patch the UI.

## Default command flow

1. Render HTML with a Datastar action attribute, such as `data-on:click="@post('/increment')"`.
2. Decode Datastar signals with `read.signals(request)`, then validate with app-owned schema code when needed. Use Web APIs directly for non-Datastar query/body/form inputs.
3. Check security/session/CSRF requirements in app code.
4. Mutate backend state through app-owned services/resources.
5. Return `reply.done()` when there is nothing to update, or return a Datastar patch/stream through `reply.*`.

## Custom browser actions

Inline Datastar expressions are fine for small behavior. When browser-only behavior needs DOM APIs, branching, or comments, you can also register a Datastar action/plugin in a browser module and call it from TSX with `ds.action(name, ...args)`:

```tsx
<button {...ds.on('click', ds.action('setSignal', 'modalOpen', true))}>Open</button>
<dialog {...ds.effect(ds.action('syncDialog', ds.signal<boolean>('modalOpen')))} />
```

See `examples/hono-custom-actions` for a complete Hono example with custom actions and a custom attribute plugin.

## Response helpers

Use `reply` helpers when a handler should produce Datastar-aware native `Response` objects:

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

Current Datastar fetch actions process response bodies as patches when the HTTP status is `200`. They treat `204` as successful completion with no body.

Use this policy:

- **`200` with a body** — Datastar may process SSE, HTML, JSON signal, or JavaScript direct responses.
- **`204` without a body** — the command succeeded and there is no browser patch to apply.
- **Other statuses** — use normal HTTP semantics for errors, redirects, and API responses.

`reply.page(...)` is normal HTTP and may use page-level statuses such as `404`.

## Patch targets and stable IDs

For ordinary component updates, render a stable `id` on the top-level element you return and omit `selector`:

```tsx
const CountView = () => <output id="count">{count}</output>

reply.patch(<CountView />)
event.patch(<CountView />)
```

Pass `selector` when the target is a container, sibling position, removable element, or CSS match:

```tsx
reply.patch(<TodoItem todo={todo} />, { selector: '#todo-list', mode: 'append' })
event.patch('', { selector: '.toast', mode: 'remove' })
```

For repeated items, use stable item IDs when those items may be patched individually:

```tsx
const TodoItem = (props: { todo: Todo }) => (
  <li id={`todo-${props.todo.id}`}>{props.todo.title}</li>
)
```

The full selector/mode guide lives in [Patch elements](patch-elements.md).

## State rule

Commands may read sparse browser signals, but durable state belongs in backend resources. For trusted values such as counters, read the current value from the server, mutate it there, and patch the rendered view.

## Forms and other request bodies

Structured `ds.get`, `ds.post`, `ds.put`, `ds.patch`, and `ds.delete` actions use Datastar's default JSON signal transport. Datastar signals and form data are distinct request inputs: use signals for sparse browser state sent by Datastar actions, and use Web APIs or framework facilities for ordinary form posts, file uploads, and non-Datastar HTTP endpoints.

For Datastar's form transport, pass `contentType: 'form'` in the fetch action options and read that request with your platform's form/multipart APIs.

Next: [Patch elements](patch-elements.md). Related: [Signals](signals.md), [Realtime streams](realtime.md).
