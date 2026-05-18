# T011 — Add observability and real browser testing

## Status

`pending`

## Why this task exists

Most current tests validate server-side strings and Effect Platform responses. That is useful, but it does not fully prove browser behavior with the actual Datastar runtime.

A framework also needs observability: when a Datastar action or SSE stream behaves incorrectly, developers need request IDs, spans, route/action names, signal decode failures, and stream lifecycle events.

## Target outcome

Add test and observability infrastructure that proves the framework works end-to-end.

## Testing work

### Browser integration tests

Use a real browser test harness to load pages with `vendor/datastar.js` and verify:

- initial Datastar boot;
- action requests;
- direct HTML responses;
- JSON signal responses;
- SSE patch responses;
- validation errors;
- live query reconnect behavior;
- request cancellation where practical.

### Protocol regression tests

Keep fixture tests for SSE encoding. Add tests for:

- status policy;
- direct response headers;
- multiline event data;
- form/multipart behavior;
- malformed signal decoding.

### Type tests

Use TypeScript compile-time tests for type contracts:

- invalid signal names;
- invalid patch payloads;
- route/action schema mismatch;
- missing Effect services if using Layers.

## Observability work

Add OpenTelemetry spans around:

- request start/end;
- signal/query/body decode;
- command execution;
- render execution;
- SSE stream open/close;
- live query invalidation/render;
- error mapping.

Useful span attributes:

- route id/path/method;
- Datastar request flag;
- response type;
- patch mode/selector where safe;
- signal schema name, not raw sensitive data;
- stream id/client id if available.

## Acceptance criteria

- At least one browser-backed test exercises actual `datastar.js`.
- Key framework paths produce spans or structured events.
- Stream open/close is observable.
- Error paths are tested, not only happy paths.
- Tests distinguish generic HTTP behavior from Datastar runtime behavior.

## Anti-goals

- Do not require a specific telemetry backend.
- Do not log raw signal payloads by default.
- Do not replace unit tests with only browser tests.
