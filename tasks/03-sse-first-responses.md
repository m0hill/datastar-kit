# T003 — Make SSE-first responses the blessed response path

## Status

`done`

## Grill level

`4/5` — major public-shape decision.

## Decision

Use a single public response factory named `reply`.

Do **not** expose response helpers named `datastar*Response`, `platform*PatchResponse`, `DatastarResponse`, or `ds.reply`.

The desired app ergonomics are:

```ts
import { ds, h, reply } from "ts-star"

h("button", ds.on("click", ds.post("/increment")), "+")

return reply.patch(countNode(count), { selector: "#count" })
return reply.signals({ count })
return reply.done()

return reply.direct.html(html, { selector: "#main" })
```

This follows the Remix-style lesson: context should come from the package/import/module, not from repeating the framework name in every helper.

## Why this task exists

The codebase currently has many ways to send what is conceptually a Datastar action response. That increases conceptual load and weakens framework identity.

Current direct-response helpers are split across two families:

- `platformHtmlPatchResponse`
- `platformJsonSignalsResponse`
- `platformScriptResponse`
- `datastarHtmlPatchResponse`
- `datastarJsonSignalsResponse`
- `datastarScriptResponse`

The problem is not that direct responses exist. Datastar supports direct `text/html`, `application/json`, and `text/javascript` responses, and they can be useful.

The problem is that the current API exposes six separate helpers with two status policies, making direct responses look like a parallel response framework.

## Naming model

Use these public names:

```ts
reply.page(body, options?)
reply.patch(elements, options?)
reply.signals(signals, options?)
reply.stream(events, options?)
reply.done(options?)

reply.direct.html(elements, options?)
reply.direct.signals(signals, options?)
reply.direct.script(script, options?)
```

### Why `reply`

- Short and pleasant in handlers.
- Reads naturally with `return reply.patch(...)` and `return reply.done()`.
- Avoids repeating `datastar` everywhere.
- Avoids a class-like `DatastarResponse` abstraction.
- Separates server response construction from `ds`, which should be reserved for Datastar attributes/actions/expressions.

### Why not `ds.reply`

`ds` should mean browser-facing Datastar primitives:

- `ds.on(...)`
- `ds.post(...)`
- `ds.bind(...)`
- `ds.signal(...)`

`reply` is server-facing HTTP response construction. Keeping it top-level makes app code clearer and avoids making `ds` a junk drawer.

## Response semantics

### `reply.page(body, options?)`

Returns a full HTML page/document response.

This is not a Datastar action response, so it may keep normal HTTP page semantics. It should default to `200`, but can allow page-level statuses such as `404` if needed.

### `reply.patch(elements, options?)`

Canonical SSE Datastar element patch response.

- Content type: `text/event-stream`
- Event: `datastar-patch-elements`
- Status: fixed/guaranteed `200`
- This replaces public `datastarPatchElementsResponse` style names.

### `reply.signals(signals, options?)`

Canonical SSE Datastar signal patch response.

- Content type: `text/event-stream`
- Event: `datastar-patch-signals`
- Status: fixed/guaranteed `200`
- This replaces public `datastarPatchSignalsResponse` style names.

### `reply.stream(events, options?)`

Canonical SSE event stream response for multiple or long-lived Datastar events.

- Content type: `text/event-stream`
- Status: fixed/guaranteed `200`
- Used by live queries and multi-event action responses.

### `reply.done(options?)`

Canonical command completion response.

- Status: fixed/guaranteed `204`
- No body
- No content type
- This is the response for successful commands with no immediate UI feedback.

### `reply.direct.html(elements, options?)`

Low-level direct Datastar HTML response escape hatch.

- Content type: `text/html; charset=utf-8`
- Uses `datastar-selector`, `datastar-mode`, `datastar-namespace`, and `datastar-use-view-transition` headers.
- Status: fixed/guaranteed `200`
- Secondary to `reply.patch(...)`.

### `reply.direct.signals(signals, options?)`

Low-level direct Datastar signal response escape hatch.

- Content type: `application/json; charset=utf-8`
- Uses `datastar-only-if-missing` header.
- Status: fixed/guaranteed `200`
- Secondary to `reply.signals(...)`.

### `reply.direct.script(script, options?)`

Low-level direct Datastar script response escape hatch.

- Content type: `text/javascript; charset=utf-8`
- Uses `datastar-script-attributes` header.
- Status: fixed/guaranteed `200`
- Secondary to SSE script events.

## Platform vs Datastar helper decision

Current distinction:

- `platform*Response` helpers are lower-level HTTP helpers and allow arbitrary statuses.
- `datastar*Response` helpers wrap those helpers and enforce Datastar action status semantics.

Final decision:

- Keep Datastar-safe status semantics in the public API.
- Remove public arbitrary-status `platform*` direct patch helpers.
- Keep any shared header-building helpers internal.
- For non-Datastar HTTP errors or arbitrary statuses, use normal Effect Platform responses.

Reason: direct Datastar responses only make sense when the browser should apply the body, and Datastar applies direct response bodies on successful `200` responses. A helper that looks like a Datastar patch response but permits `400`, `401`, or `500` is a footgun.

## Public API changes to plan

Add or expose:

- `reply.page`
- `reply.patch`
- `reply.signals`
- `reply.stream`
- `reply.done`
- `reply.direct.html`
- `reply.direct.signals`
- `reply.direct.script`

Remove from public API:

- `platformHtmlPatchResponse`
- `platformJsonSignalsResponse`
- `platformScriptResponse`
- `datastarHtmlPatchResponse`
- `datastarJsonSignalsResponse`
- `datastarScriptResponse`
- verbose `datastar*Response` app-facing aliases for canonical replies

## Implementation work

- Create the `reply` factory/module.
- Move direct response header construction behind `reply.direct.*` or internal helpers.
- Remove public arbitrary-status direct patch helpers.
- Ensure action body responses cannot accidentally use non-`200` statuses.
- Ensure `reply.done` cannot accidentally include a body or content type.
- Update examples to use `reply.patch`, `reply.signals`, `reply.stream`, and `reply.done` by default.
- Use `reply.direct.*` only in explicit escape-hatch examples, if any.
- Update tests to verify:
  - SSE patch responses;
  - direct response headers/content types;
  - status restrictions;
  - absence of duplicate public helper families;
  - concise public naming.

## Acceptance criteria

- Example handlers look like `return reply.patch(...)`, not `return datastarPatchElementsResponse(...)`.
- Users see SSE patch responses as the obvious default.
- Direct responses remain possible but visibly secondary under `reply.direct.*`.
- Public names are concise and framework-ergonomic.
- There is no public `platform*`/`datastar*` duplication for the same direct response behavior.
- Datastar action response status rules are enforced by types and runtime guards.
- Examples do not mix direct and SSE responses for equivalent use cases.
- Tests still verify Datastar direct response semantics because the runtime supports them.

## Anti-goals

- Do not remove direct response support entirely.
- Do not keep multiple equivalent helper families.
- Do not expose arbitrary-status Datastar patch helpers.
- Do not introduce a class-heavy response abstraction.
- Do not use verbose names just because they are explicit internally.
- Do not use `ds` as a catch-all namespace for unrelated server APIs.
- Do not add migration aliases; there are no users yet.
