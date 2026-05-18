# T010 — Trim the generic Platform HTTP surface

## Status

`pending`

## Grill level

`3/5` — design cleanup with a recommended answer.

## Why this task exists

`src/platform.ts` should be a focused Datastar + Effect Platform adapter. It currently also exposes generic HTTP/form/multipart helpers and duplicate response layers.

A focused framework should not become a general-purpose wrapper around all Effect Platform request APIs.

## Recommended answer

Keep Datastar-specific decoding and response helpers. Let users call Effect Platform directly for generic forms/multipart unless `ts-star` adds a concrete, opinionated form story later.

## Keep candidates

- Datastar request detection
- raw Datastar signal extraction
- signal JSON parsing
- schema-based signal decoding
- schema-based query decoding
- canonical response helpers from T003
- `platformRouter` if it meaningfully improves Effect Platform ergonomics

## Removal/internal candidates

- `platformReadUrlEncodedForm`
- `platformReadUrlEncodedFormFromRequest`
- `platformReadForm`
- `platformReadFormFromRequest`
- `platformReadMultipart`
- `platformReadMultipartFromRequest`
- generic `UrlEncodedFormInput` type
- direct response helpers already covered by T003

## Implementation work

- Remove generic form/multipart wrappers from public API.
- Keep tests for Datastar GET/DELETE query signal semantics and body signal semantics.
- Rename canonical helpers if `platform` prefix becomes noise after export curation.
- Update docs to recommend using Effect Platform directly for generic HTTP concerns.

## Acceptance criteria

- Platform module has a clear Datastar adapter identity.
- There are not two framework ways to read the same request shape.
- Form/multipart support is not exposed prematurely.
- Examples remain locally readable.

## Anti-goals

- Do not wrap every Effect Platform helper for convenience.
- Do not define a form abstraction unless implementing a full form story.
- Do not preserve removed wrappers for compatibility.
