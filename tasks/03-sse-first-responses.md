# T003 — Make SSE-first responses the only blessed response path

## Status

`pending`

## Grill level

`4/5` — major public-shape decision.

## Why this task exists

The codebase has many ways to send a Datastar response. That increases conceptual load and makes framework identity unclear.

Datastar itself recommends SSE responses as the normal path: one response can send zero or more element patches, signal patches, and scripts. Direct `text/html`, `application/json`, and `text/javascript` responses are supported by the runtime, but should not be presented as equally blessed framework primitives.

## Recommended answer

Canonical response concepts:

- page/html document response;
- SSE element patch response;
- SSE signal patch response;
- SSE event stream response;
- `204` command completion.

Direct response helpers should be removed from public API or renamed as explicit low-level escape hatches.

## Implementation work

- Collapse `platform*` and `datastar*` response duplication.
- Choose canonical names and use them everywhere.
- Remove public direct response helpers or move them internal.
- Ensure `200` body responses and `204` no-content responses remain status-safe.
- Update examples to use the canonical SSE helpers.
- Update tests to cover the canonical path instead of every duplicate path.

## Removal candidates

- `platformHtmlPatchResponse`
- `platformJsonSignalsResponse`
- `platformScriptResponse`
- `datastarHtmlPatchResponse`
- `datastarJsonSignalsResponse`
- `datastarScriptResponse`
- duplicate platform/datastar pairs for the same thing

## Keep or replace with

- `page(...)` or `htmlResponse(...)`
- `patchElementsResponse(...)`
- `patchSignalsResponse(...)`
- `eventStreamResponse(...)`
- `noContentResponse(...)` / `commandDone(...)`

## Acceptance criteria

- A user can see one obvious way to patch elements/signals.
- Direct response support is gone from public docs or clearly marked low-level.
- Examples no longer mix direct HTML patch and SSE patch styles for equivalent use cases.
- Tests still verify Datastar runtime semantics.

## Anti-goals

- Do not support multiple equivalent response APIs for hypothetical preference.
- Do not optimize for migration from old helper names.
- Do not add a response abstraction object unless it removes more complexity than it adds.
