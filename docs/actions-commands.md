# Actions and commands

Actions are HTTP routes triggered by Datastar attributes. Commands are actions that mutate backend state.

## Default command flow

1. Render HTML with a Datastar action attribute such as `data-on:click="@post('/increment')"`.
2. Decode Datastar signals with `read.signals(...)`, or use Effect Platform directly for non-Datastar query/body/form inputs.
3. Check security/session/CSRF requirements in app code when needed.
4. Mutate backend state through an app-owned Effect service.
5. Return `reply.done()` for no immediate UI feedback, or return a Datastar patch/stream through `reply.*`.

## Responses

Use `reply` helpers:

- `reply.done()` for successful commands with no body (`204`).
- `reply.patch(...)` for the default SSE element patch response.
- `reply.signals(...)` for the default SSE signal patch response.
- `reply.stream(...)` for multiple events or long-lived streams such as live queries.
- `reply.direct.*` only as explicit Datastar direct-response escape hatches.

Datastar action responses with bodies should be successful `200` responses. Use normal Effect Platform responses for non-Datastar HTTP errors.

## State rule

Commands may read sparse browser signals, but durable state belongs in backend services. Do not increment a trusted count by accepting `$count` from the client; read the current count from the server and patch the rendered view.

## Typed inputs

Use `contract.signals(schema)` when a signal shape should produce typed Datastar refs, initial signal props, and typed patches. Decode Datastar signal payloads at the request boundary with `read.signals(Contact.schema)`.
