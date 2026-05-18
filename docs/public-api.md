# Public API and extension points

`ts-star` is still pre-release. This document names the intended public boundary so users know what is stable enough to build on and what remains experimental.

## Import style

Prefer namespace imports from the package root:

```ts
import { Datastar, Sse, Platform } from "ts-star"
```

Root-level named exports remain convenient for examples, but namespace imports communicate ownership and make future deprecations easier.

## Stable public candidates

These modules are closest to stable because they mirror external protocol/runtime concepts:

- `Sse` / `src/sse.ts` — Datastar SSE event encoding.
- `Datastar` / `src/datastar.ts` — Datastar expression/action/signal/attribute helpers and signal policy helpers.
- `Contracts` / `src/contracts.ts` — Effect Schema-derived signal/action contracts.
- Core `Platform` helpers / `src/platform.ts` — signal/query/form decoding and Datastar-safe response constructors.

Breaking changes here should require a migration note.

## Experimental public API

These are intentionally public for examples and feedback, but can change before a release:

- `Html` / `src/html.ts` — tiny builder, renderer interface, raw/ordered attr helpers.
- `Jsx` / `src/jsx.ts` — thin JSX factory; not a component runtime.
- `Client` / `src/client.ts` — Datastar document/script/client asset helpers.
- `Model` / `src/model.ts` — command/current-view/live-query prototype helpers.
- `Runtime` / `src/runtime.ts` — Effect service/layer boundary.
- `Realtime` / `src/realtime.ts` — PubSub/Stream primitives.
- `Security` / `src/security.ts` — CSRF/auth/limits/safe navigation hooks.
- `Validation` / `src/validation.ts` — validation/domain error UX helpers.
- `Observability` / `src/observability.ts` — telemetry service and span helpers.

## Internal code

Implementation-only code should live under `src/internal/**` and must not be exported from `src/index.ts`. No current source file is internal because the project is still small, but new private helpers should not be added to the root export by default.

## Extension points

`ts-star` avoids plugin discovery. Extensions are normal Effect services/layers and adapter interfaces.

### Renderer

Implement `Html.Renderer<Node>` or provide the `Runtime.HtmlRenderer` service to render another template system. Preserve escaping and Datastar attribute order.

### Datastar client asset

Use `Client.datastarDocument`, `Client.datastarScript`, `Client.datastarClientRoute`, or `Client.datastarClientFileRoute` to choose CDN/self-hosted/pinned client behavior. Future integrity/versioning should extend these helpers rather than introduce a plugin system.

### Realtime backend

Core uses Effect `Stream` and `PubSub` abstractions. Database notifications, Redis, NATS, or other brokers should adapt to `Stream` invalidations and then use `Model.LiveQuery` / `Runtime.LiveQueryHub` semantics.

### Security/session/auth

Use `Security.AuthContext` for small examples or replace it with richer app-specific services. CSRF token generation/storage is intentionally app/session-specific; `requireCsrfToken` is only the verification hook.

### Error mapping

Provide a custom `Runtime.ErrorMapper` layer when domain errors should produce Datastar patches or app-specific status responses.

### Telemetry

Provide a custom `Observability.Telemetry` layer to bridge to OpenTelemetry or another backend. The default runtime layer uses noop telemetry.

## Versioning and deprecation policy

Before a public release:

- mark experimental APIs in docs;
- prefer additive changes;
- keep deprecated aliases for at least one minor release once versioning begins;
- include migration notes for stable-candidate changes;
- avoid moving implementation details into `src/index.ts` unless they are intentionally public.

## What not to add

Do not add:

- plugin discovery/registration;
- renderer-specific core dependencies;
- broker-specific realtime dependencies;
- a required auth/session framework;
- frontend-store abstractions.
