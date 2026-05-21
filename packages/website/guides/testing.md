# Testing

Datastar Kit is easiest to test at the same boundary it runs at: native `Request` in, native `Response` out. You usually do not need framework mocks for the SDK-shaped parts.

## Testing layers

- **Pure helper tests** — Datastar attributes, HTML escaping, SSE encoding, and response helper semantics.
- **Request/response tests** — native `Request`, `read.signals`, `reply.*`, and Datastar response status semantics.
- **Example tests** — workspace examples and their framework/runtime wiring.
- **Browser/runtime tests** — real Datastar browser behavior for protocol assumptions that unit tests cannot prove.

## Guidance

Test with real `Request` and `Response` objects whenever possible. Avoid framework mocks when a plain fetch-compatible handler can be called directly.

When changing examples, keep their tests close to the example package so the example remains copyable and honest about its dependencies.

Observability is app-owned. Use your platform's logging, tracing, metrics, and OpenTelemetry setup directly; Datastar Kit does not wrap those APIs.

Next: [Examples](examples.md). Related: [Deployment](deployment.md), [API reference](../reference/api.md).
