# T004 — Make the runtime Effect-native

## Status

`pending`

## Why this task exists

`ts-star` currently uses Effect, but mostly as handler return type, schema decoder, platform router, stream, and PubSub. That is a good start, but it is not yet an Effect-style framework architecture.

A real Effect framework should use Effect for:

- dependency injection through services/layers;
- scoped resource lifecycle;
- typed errors;
- structured concurrency;
- request context;
- cancellation;
- observability hooks.

## Target outcome

Create a runtime layer where the framework is naturally expressed as Effect services and layers rather than plain helper functions wrapped in `Effect.succeed`.

## Services to consider

Do not implement all at once, but design the boundary:

- `TsStarConfig` — Datastar client path, defaults, runtime mode.
- `HtmlRenderer` — render framework HTML nodes or external templates.
- `DatastarProtocol` — patch response/event construction.
- `RequestContext` — current request, route params, user/session/auth context.
- `SignalDecoder` — schema-based signal decoding.
- `ErrorMapper` — typed framework/domain errors to responses.
- `LiveQueryHub` — subscriptions, invalidation, stream management.
- `Security` — CSRF/session helpers or hooks.
- `Telemetry` — spans/logging/metrics hooks.

## Request lifecycle

Define the lifecycle explicitly:

1. request enters Effect Platform router;
2. framework creates/derives request context;
3. security/session/auth hooks run;
4. signals/query/body/form are decoded at the boundary;
5. user handler runs with typed services;
6. errors are mapped;
7. response is finalized;
8. scoped resources are released or stream lifecycle continues under scope.

## Error model

Avoid throwing from framework code where typed errors are useful.

Examples:

- `SignalJsonError`
- `SignalDecodeError`
- `InvalidDatastarResponseStatus`
- `CsrfError`
- `Unauthorized`
- `ValidationError`
- `RouteActionMismatch`

These should compose with domain errors.

## Implementation work

- Introduce service tags for the smallest useful runtime set.
- Replace or supplement direct helper calls with service-backed APIs.
- Add a request context abstraction.
- Add typed error mapping for signal decode failures and validation failures.
- Ensure streams/subscriptions are scoped and cancellable.
- Avoid global mutable state in examples.

## Acceptance criteria

- A non-trivial app can be assembled from `Layer`s.
- Handlers can require services in their Effect context.
- Missing dependencies are caught by the Effect type system.
- Live streams clean up subscriptions when clients disconnect.
- Framework errors have typed channels and documented response mappings.

## Anti-goals

- Do not hide Effect behind promise-like APIs.
- Do not erase context types for convenience.
- Do not force all users into a large application container before the model is proven.
