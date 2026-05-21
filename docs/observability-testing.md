# Observability and testing

Observability is not a public Datastar Kit API. Applications should use their platform's logging, tracing, metrics, and OpenTelemetry setup directly. Core SDK tests focus on protocol correctness and integration behavior.

## Testing layers

- **Pure helper tests** — Datastar attributes, HTML escaping, SSE encoding, and response helper semantics.
- **Request/response tests** — native `Request`, `read.signals`, `reply.*`, and Datastar response status semantics.
- **Example tests** — fetch-compatible example handlers and the local Node dev server.
- **Browser/runtime tests** — real Datastar browser behavior where JavaScript runtime semantics matter.

## Guidance

Test with real `Request` and `Response` objects whenever possible. Avoid framework mocks when a plain fetch-compatible handler can be called directly.
