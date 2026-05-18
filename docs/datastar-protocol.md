# Datastar protocol and response semantics

This document records the Datastar protocol policy for `ts-star` action handlers.

## Status policy for Datastar actions

Current Datastar fetch actions process response bodies as patches only when the HTTP status is `200`. They treat `204` as success with no body. Non-200 bodies should not be relied on for UI patches.

Use this policy for SDK helpers:

- **`200` with a body** — Datastar may process SSE, HTML, JSON signal, or JavaScript direct responses.
- **`204` without a body** — the command succeeded and there is no browser patch to apply.
- **Other statuses** — use normal HTTP semantics; do not expect Datastar to apply the body.

`reply.page(...)` is normal HTTP and may use page-level statuses such as `404`.

## Response helpers

- `reply.page(...)` — full HTML page/document response.
- `reply.patch(...)` — blessed SSE element patch response.
- `reply.signals(...)` — blessed SSE signal patch response.
- `reply.stream(...)` — SSE event stream response for multiple or long-lived events.
- `reply.done(...)` — `204` command completion with no body.
- `reply.navigate(...)` — safe Datastar direct script response for browser navigation.
- `reply.directHtml(...)`, `reply.directSignals(...)`, `reply.directScript(...)` — explicit direct-response escape hatches.

Datastar action helpers own their protocol status codes and do not accept a `status` option.

## Signal decoding

Use `read.signals(request, schema)` for Datastar signal payloads. It hides Datastar's transport detail:

- `GET`/`DELETE` actions read the `datastar` query parameter.
- Other methods read the request body as JSON.

Invalid JSON throws `SignalParseError`. Standard Schema mismatches throw `SignalValidationError` with the original issues.

## Forms and other request bodies

Structured `ds.get`, `ds.post`, `ds.put`, `ds.patch`, and `ds.delete` actions use Datastar's default JSON signal transport. Datastar signals and form data are distinct request inputs. Use signals for sparse browser state sent by Datastar actions; use Web APIs or framework facilities for ordinary form posts, file uploads, and non-Datastar HTTP endpoints.

If you intentionally need Datastar's form transport, make the escape hatch visible in view code:

```ts
ds.raw("@post('/avatar', { contentType: 'form' })")
```

Then read that request with your platform's form/multipart APIs, not `read.signals(...)`.
