# Datastar protocol and response semantics

This document records the working Datastar protocol policy for `ts-star` action handlers.

## Status policy for Datastar actions

Datastar action response bodies are only a reliable patch mechanism when the HTTP response is successful with status `200`.

Use this policy for action helpers:

- **`200` with a body** — Datastar may process SSE, HTML, JSON signal, or JavaScript direct responses.
- **`204` without a body** — the command succeeded and there is no browser patch to apply.
- **`3xx`, `4xx`, `5xx`, and non-200 `2xx` with bodies** — do not rely on Datastar applying those bodies to the UI.

Validation failures and recoverable domain errors should usually return `200` with a patch that renders the current error state. Reserve non-2xx statuses for generic HTTP clients or failures where no Datastar patch is expected.

## Response helpers

Use `reply` for Datastar-aware responses:

- `reply.page(...)` — full HTML page/document response. This is normal HTTP and may use page-level statuses such as `404`.
- `reply.patch(...)` — blessed SSE element patch response.
- `reply.signals(...)` — blessed SSE signal patch response.
- `reply.stream(...)` — SSE event stream response for multiple or long-lived events.
- `reply.done(...)` — `204` command completion with no body.
- `reply.navigate(...)` — safe Datastar direct script response for browser navigation.
- `reply.direct.*` — explicit direct-response escape hatches for Datastar HTML, JSON signal, and script direct responses.

SSE patch helpers are the default path. Direct responses remain available because Datastar supports them, but they should not become a parallel response style in ordinary app code.

Body helpers only accept/emit `200`. `reply.done` only accepts/emits `204`.

## Direct response headers

The direct response escape hatches preserve Datastar header names used by the browser runtime:

- `datastar-selector`
- `datastar-mode`
- `datastar-namespace`
- `datastar-use-view-transition`
- `datastar-only-if-missing`
- `datastar-script-attributes`

Low-level SSE event encoding is available from `ts-star/sse` and is checked against Datastar SDK fixtures, including multiline data fields and default option omission.

## Signal decoding

Use `read.signals(schema)` for Datastar signal payloads.

`read.signals` intentionally hides Datastar's transport detail:

- `GET`/`DELETE` actions read the `datastar` query parameter.
- Other methods read the request body as JSON.

Invalid JSON and schema mismatches fail through standard Effect Schema decoding errors. There is no public ts-star parse error class.

## Forms and other request bodies

Structured `ds.get`, `ds.post`, `ds.put`, `ds.patch`, and `ds.delete` actions intentionally use Datastar's default JSON signal transport. This matches `read.signals(schema)`.

`ts-star` does not expose generic form, multipart, body, or query readers. Use Effect Platform directly for those HTTP concerns until the framework has a concrete form/file-upload story.

Datastar signals and form data are distinct request inputs. Use signals for sparse browser state sent by Datastar actions; use normal Effect Platform request APIs for ordinary form posts, file uploads, and non-Datastar HTTP endpoints.

If you intentionally need Datastar's form transport, make the escape hatch visible in the view code:

```ts
ds.raw("@post('/avatar', { contentType: 'form' })")
```

Then read that request with native Effect Platform form/multipart APIs, not `read.signals(...)`.

## Runtime validation

`test/datastar-browser-runtime.test.ts` starts a real browser with `agent-browser`, loads the versioned Datastar CDN script used by examples, performs Datastar actions, and verifies that:

- a `200` JSON direct response updates a signal-driven DOM node;
- a `202` JSON body is not treated as a Datastar UI patch.

This complements unit tests for helpers and SDK fixture tests for SSE encoding.
