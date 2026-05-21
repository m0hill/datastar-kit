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

Datastar action helpers own their protocol status codes and do not accept `status` or `statusText` in their native response init. Keep Datastar protocol options separate from native response options:

```tsx
reply.patch(<Count />, {}, { headers: { 'x-action': 'increment' } })
reply.signals({ saving: false }, { onlyIfMissing: true }, { headers: { 'x-action': 'save' } })
```

## Status semantics

Current Datastar fetch actions process response bodies as patches only when the HTTP status is `200`. They treat `204` as success with no body. Non-200 bodies should not be relied on for UI patches.

Use this policy:

- **`200` with a body** — Datastar may process SSE, HTML, JSON signal, or JavaScript direct responses.
- **`204` without a body** — the command succeeded and there is no browser patch to apply.
- **Other statuses** — use normal HTTP semantics; do not expect Datastar to apply the body.

`reply.page(...)` is normal HTTP and may use page-level statuses such as `404`.

## Selector usage

For ordinary component updates, omit `selector` and render stable IDs on each top-level element. Datastar matches those IDs in the default `outer` patch mode:

```tsx
reply.patch(<Count />)
event.patch(<Count />)
```

Pass `selector` when the patch targets a container or CSS match instead of the returned element itself, such as appending or prepending list items, removing elements, patching `inner` HTML, or updating multiple targets:

```tsx
reply.patch(<TodoItem todo={todo} />, { selector: '#todos', mode: 'append' })
event.patch('', { selector: '.toast', mode: 'remove' })
```

## State rule

Commands may read sparse browser signals, but durable state belongs in backend resources. Do not increment a trusted count by accepting `$count` from the client; read the current count from the server and patch the rendered view.

## Forms and other request bodies

Structured `ds.get`, `ds.post`, `ds.put`, `ds.patch`, and `ds.delete` actions use Datastar's default JSON signal transport. Datastar signals and form data are distinct request inputs. Use signals for sparse browser state sent by Datastar actions; use Web APIs or framework facilities for ordinary form posts, file uploads, and non-Datastar HTTP endpoints.

If you intentionally need Datastar's form transport, pass `contentType: 'form'` in the fetch action options and read that request with your platform's form/multipart APIs, not `read.signals(...)`.

Next: [Validation and errors](validation-and-errors.md). Related: [Signals](signals.md), [Realtime streams](realtime.md).
