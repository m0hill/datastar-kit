# Actions and commands

Actions are HTTP routes triggered by Datastar attributes. Commands are actions that mutate backend state.

## Default command flow

1. Render HTML with a Datastar action attribute such as `data-on:click="@post('/increment')"`.
2. Decode Datastar signals with `read.signals(request, schema)`, or use Web APIs directly for non-Datastar query/body/form inputs.
3. Check security/session/CSRF requirements in app code when needed.
4. Mutate backend state through app-owned services/resources.
5. Return `reply.done()` for no immediate UI feedback, or return a Datastar patch/stream through `reply.*`.

## Responses

Use `reply` helpers:

- `reply.done()` for successful commands with no body (`204`).
- `reply.patch(...)` for the default SSE element patch response.
- `reply.signals(...)` for the default SSE signal patch response.
- `reply.stream(...)` for multiple events or long-lived SSE streams.
- `reply.directHtml(...)`, `reply.directSignals(...)`, and `reply.directScript(...)` only as explicit Datastar direct-response escape hatches.

Datastar action responses with bodies should be successful `200` responses. Use plain `new Response(...)` for ordinary non-Datastar HTTP errors.

## State rule

Commands may read sparse browser signals, but durable state belongs in backend resources. Do not increment a trusted count by accepting `$count` from the client; read the current count from the server and patch the rendered view.
