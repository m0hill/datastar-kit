# Observability and browser testing

`ts-star` keeps string/unit tests for fast protocol coverage, but framework behavior also needs browser-backed tests and observable runtime paths.

## Browser integration

`test/datastar-browser-runtime.test.ts` uses `agent-browser` with a real Chrome instance and the pinned `vendor/datastar.js`. It verifies actual Datastar runtime behavior: successful `200` direct JSON signal responses apply, while non-200 action bodies are not treated as UI patches.

Keep this style for protocol changes that depend on browser behavior. Unit tests are still preferred for pure encoding, type contracts, and Effect service behavior.

## Telemetry service

`src/observability.ts` defines an OpenTelemetry-friendly service boundary without requiring a telemetry backend:

- `Telemetry` service with `startSpan`.
- `TelemetrySpan` methods: `setAttribute`, `addEvent`, `recordException`, `end`.
- `NoopTelemetryLive` for default runtime wiring.
- `makeInMemoryTelemetry()` for tests.

The runtime core layer provides noop telemetry so handlers can depend on the service without configuring a backend immediately.

## Span helpers

- `withSpan(name, attrs, effect)` — generic effect span.
- `observeRequest(attrs, effect)` — records request span and response status.
- `observeDecode(kind, schemaName, effect)` — signal/query/form/body decode spans.
- `observeRender(name, effect)` — render spans.
- `observeStream(name, attrs, stream)` — stream open/error/close spans.

Recommended attributes:

- `http.route`, `http.request.method`, `http.response.status_code`;
- `datastar.request`;
- `ts-star.schema` (schema/contract name only, not raw payloads);
- `ts-star.render.name`;
- patch selector/mode when safe;
- stream kind/id when available.

Do not record raw signal payloads, form values, cookies, or secrets by default.

## Error paths

Instrumentation should cover both happy paths and failures. `withSpan`, `observeRequest`, and `observeStream` record exceptions before preserving the original error channel.

## Testing policy

Coverage is layered:

- **Pure unit tests** — SSE fixtures, multiline data, default omission behavior, signal naming, HTML escaping, safe URL validation.
- **Runtime tests** — Effect services/layers, typed error mapping, scoped live-query hubs, observability spans.
- **Browser tests** — actual Datastar runtime behavior for direct responses and actions.
- **Type tests** — `@ts-expect-error` coverage for contracts and missing services.

This avoids overfitting to browser tests while still catching protocol/runtime mismatches that string tests cannot prove.
