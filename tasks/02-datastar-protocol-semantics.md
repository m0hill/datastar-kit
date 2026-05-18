# T002 — Lock down Datastar protocol semantics

## Status

`done`

## Why this task exists

The current protocol helpers are among the strongest parts of `ts-star`. `src/sse.ts` matches Datastar SDK fixtures, and the platform response helpers cover SSE, direct HTML, JSON signals, and JavaScript responses.

However, the framework currently allows some invalid or misleading combinations. The most important issue: the Datastar browser runtime only applies action response bodies for successful `200` responses. `204` is the expected success-without-body case. Non-200 responses are not a reliable patch delivery mechanism.

The current tests demonstrate arbitrary statuses like `201` and `202` for direct Datastar responses. That is fine for generic HTTP helpers, but dangerous if presented as Datastar action helpers.

## Target outcome

Make Datastar response behavior hard to misuse and aligned with the actual `datastar.js` runtime.

## Required decisions

### 1. Response status policy

For Datastar action responses:

- `200` with body means Datastar can process SSE/HTML/JSON/JS.
- `204` means success with no body.
- `3xx`, `4xx`, `5xx` should not be used when expecting Datastar to patch UI.
- Validation and recoverable errors should usually return `200` with a patch that renders the error state.

This should be encoded in helpers or enforced by specialized helper names.

### 2. Separate generic HTTP helpers from Datastar action helpers

A generic `platformHtmlResponse(..., { status: 201 })` can remain possible.

But a Datastar-specific helper like `datastarHtmlPatch(...)` should either:

- force status `200`, or
- reject incompatible statuses, or
- make the status override intentionally awkward.

### 3. Form and multipart story

Datastar supports `contentType: "form"`, including regular form encoding and multipart forms. `ts-star` currently focuses on JSON signal decoding.

Decide and implement:

- URL-encoded form decoding helpers.
- Multipart handling via Effect Platform facilities.
- Clear distinction between Datastar signals and form data.
- Examples showing when to use signals vs forms.

### 4. Header names and response overrides

Current direct response helpers set headers such as:

- `datastar-selector`
- `datastar-mode`
- `datastar-namespace`
- `datastar-use-view-transition`
- `datastar-only-if-missing`
- `datastar-script-attributes`

Keep these aligned with `datastar.js` and Datastar docs.

## Implementation work

- Add Datastar-specific response helpers with safe status behavior.
- Rename or document existing generic helpers if needed.
- Add tests that reflect the actual client behavior.
- Add form/multipart decoding tests.
- Keep SDK fixture tests for SSE encoding.
- Add tests for multiline data fields and default omission behavior.

## Browser runtime validation

Unit tests are not enough. Add at least one browser integration test that loads `vendor/datastar.js`, performs a Datastar action, and verifies DOM/signal changes.

This catches mismatches between documented protocol and actual minified runtime behavior.

## Acceptance criteria

- It is not easy to accidentally return `202` with a body and expect Datastar to patch it.
- JSON signal decoding and form decoding are both supported or intentionally scoped.
- SSE fixtures still pass.
- At least one browser-backed test proves actual Datastar runtime integration.
- Docs describe response status semantics clearly.

## Anti-goals

- Do not fork or wrap the Datastar client.
- Do not invent a parallel protocol.
- Do not make every HTTP response helper Datastar-specific.
