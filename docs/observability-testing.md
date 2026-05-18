# Browser and runtime testing

`ts-star` keeps string/unit tests for fast protocol coverage, but framework behavior also needs browser-backed tests when behavior depends on the actual Datastar runtime.

Observability is not a public `ts-star` API. Applications should use Effect tracing and OpenTelemetry directly for logs/traces/metrics. Core framework tests focus on protocol correctness and integration behavior.

## Browser integration

`test/datastar-browser-runtime.test.ts` uses `agent-browser` with a real Chrome instance and the same versioned Datastar CDN URL used by the examples. It verifies actual Datastar runtime behavior such as:

- successful `200` direct JSON signal responses apply;
- non-200 action bodies are not treated as UI patches;
- Datastar request/response semantics match the browser runtime, not only string fixtures.

Keep this style for protocol changes that depend on browser behavior. Unit tests are still preferred for pure encoding, type contracts, request decoding, and server-side helpers.

## Testing policy

Coverage is layered:

- **Pure unit tests** — SSE fixtures, multiline data, default omission behavior, signal naming, HTML escaping, safe navigation URL validation.
- **Request/response tests** — Effect Platform routes, `read.signals`, `reply.*` helpers, and Datastar response status semantics.
- **Live-query tests** — current-state render-on-connect behavior and invalidation-trigger semantics.
- **Browser tests** — actual Datastar runtime behavior for direct responses and actions.
- **Type tests** — `@ts-expect-error` coverage for contracts and public API boundaries.

This avoids overfitting to browser tests while still catching protocol/runtime mismatches that string tests cannot prove.

## App observability

For application observability, prefer the platform-native tools you already use with Effect and your HTTP runtime. Instrument app services, request middleware, and domain handlers directly rather than depending on a framework-specific telemetry facade.

Do not record raw signal payloads, form values, cookies, or secrets by default.
