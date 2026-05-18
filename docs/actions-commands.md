# Actions and commands

Actions are HTTP routes triggered by Datastar attributes. Commands are actions that mutate backend state.

## Default command flow

1. Render HTML with a Datastar action attribute such as `data-on:click="@post('/increment')"`.
2. Decode request query/body/signals with Effect Schema.
3. Check security/session/CSRF requirements for writes.
4. Mutate backend state through an Effect service.
5. Return `commandDone()` / `204`, a direct HTML patch, a validation/error patch, or an SSE stream.

## Responses

Use Datastar-safe helpers:

- `commandDone()` or `datastarNoContentResponse()` for commands with no immediate patch.
- `currentViewPatchResponse(selector, html)` or `datastarHtmlResponse(...)` for server-rendered replacement.
- validation helpers from `Validation` for recoverable form errors.
- `ErrorMapper` for malformed decode, security, or fatal domain errors.

Datastar direct UI responses should be `200`. Use `204` only for no-body command completion.

## State rule

Commands may read sparse browser signals, but durable state belongs in backend services. Do not increment a trusted count by accepting `$count` from the client; read the current count from the server and patch the rendered view.

## Typed inputs

Prefer `Contracts.defineSignals`, `defineAction`, `defineQueryAction`, and platform decode helpers so route URLs, signal names, and decoders come from one contract.
