# Datastar protocol and response semantics

This document records the working Datastar protocol policy for `ts-star` action handlers.

## Status policy for Datastar actions

Datastar action response bodies are only a reliable patch mechanism when the HTTP response is successful with status `200`.

Use this policy for action helpers:

- **`200` with a body** — Datastar may process SSE, HTML, JSON signal, or JavaScript direct responses.
- **`204` without a body** — the command succeeded and there is no browser patch to apply.
- **`3xx`, `4xx`, `5xx`, and non-200 `2xx` with bodies** — do not rely on Datastar applying those bodies to the UI.

Validation failures and recoverable domain errors should usually return `200` with a patch that renders the current error state. Reserve non-2xx statuses for generic HTTP clients or failures where no Datastar patch is expected.

## Helper split

`ts-star` intentionally keeps generic Effect Platform response helpers and Datastar action helpers separate.

Generic helpers such as `platformHtmlResponse` and lower-level `platform*Response` functions can still carry arbitrary HTTP status codes when you need normal HTTP behavior.

Datastar action helpers encode the browser runtime policy in their types and runtime checks:

- `datastarPatchElementsResponse(...)`
- `datastarPatchSignalsResponse(...)`
- `datastarSseResponse(...)`
- `datastarEventStreamResponse(...)`
- `datastarHtmlPatchResponse(...)`
- `datastarJsonSignalsResponse(...)`
- `datastarScriptResponse(...)`
- `datastarNoContentResponse(...)`

Body helpers only accept/emit `200`. `datastarNoContentResponse` only accepts/emits `204`.

## Direct response headers

The direct response helpers preserve Datastar header names used by the browser runtime:

- `datastar-selector`
- `datastar-mode`
- `datastar-namespace`
- `datastar-use-view-transition`
- `datastar-only-if-missing`
- `datastar-script-attributes`

SSE event encoding remains in `src/sse.ts` and is checked against Datastar SDK fixtures, including multiline data fields and default option omission.

## Signals vs forms

Datastar signals and form data are distinct request inputs.

Use **signals** for sparse browser state that the Datastar runtime sends with an action: counters, selected IDs, validation flags, loading indicators, and small request parameters. Decode them with:

- `platformReadSignals(schema)`
- `platformReadSignalsFromRequest(request, schema)`

Use **forms** when the browser sends user-entered form data, especially with `contentType: "form"`, URL-encoded posts, or file uploads. Decode them with:

- `platformReadUrlEncodedForm(schema)` / `platformReadUrlEncodedFormFromRequest(request, schema)` for `application/x-www-form-urlencoded`.
- `platformReadForm(schema)` / `platformReadFormFromRequest(request, schema)` when a handler accepts either URL-encoded or multipart form data.
- `platformReadMultipart(schema)` / `platformReadMultipartFromRequest(request, schema)` when a handler specifically requires persisted multipart data.

Multipart decoding uses Effect Platform multipart facilities and therefore needs the normal platform services (`Scope`, filesystem, and path services) at the runtime edge.

## Runtime validation

`test/datastar-browser-runtime.test.ts` starts a real browser with `agent-browser`, loads the pinned `vendor/datastar.js`, performs Datastar actions, and verifies that:

- a `200` JSON direct response updates a signal-driven DOM node;
- a `202` JSON body is not treated as a Datastar UI patch.

This complements unit tests for helpers and SDK fixture tests for SSE encoding.
