# T009 — Resolve cross-cutting cleanup: validation recipe, `reply.navigate`, and observability removal

## Status

`pending`

## Grill level

`5/5` — identity-defining decision.

## Settled decisions

1. Do **not** treat Validation, Security, and Observability as one uniform bucket.
2. Remove public `Validation` namespace, but keep validation as a documented/example pattern.
3. Keep the validation-form example as a first-class recipe-style example with app-local helpers.
4. Remove public request-policy and identity helpers from `Security`.
5. Do not keep a broad public `Security` namespace.
6. Add navigation as a response concern: `reply.navigate(...)`.
7. `reply.navigate(...)` returns a Datastar-safe `200 text/javascript` direct response.
8. `reply.navigate(...)` validates the target URL internally before generating `window.location.href = ...`.
9. Navigation URL policy is same-origin by default, with explicit `allowedOrigins` for external destinations.
10. Remove public `Observability` namespace and custom telemetry facade.
11. Apps should use Effect tracing/OpenTelemetry directly.
12. Delete telemetry API/tests, but keep/rename browser/runtime testing guidance.
13. Keep a short security-boundaries guide, but remove `Security.*` API docs.

## Why this task exists

After T003–T008, the public framework shape is intentionally contextual and small:

```ts
import { contract, ds, live, read, reply, h, props } from "ts-star"
```

`Security`, `Validation`, and `Observability` were older growth-oriented modules. Keeping them as public root modules would pull the framework toward a generic enterprise web framework instead of a server-driven Datastar + Effect framework.

However, not all three concerns have the same status:

- validation UX is an important Datastar/server-driven pattern, but the exact error classes and payload helpers should be app-local for now;
- auth, CSRF, request limits, and identity are application/router policy concerns;
- safe browser navigation is a small hypermedia response concern and belongs in `reply`;
- observability should use Effect/OpenTelemetry directly until framework internals need real instrumentation.

## Target public API effect

### Remove from root/public core

```ts
Validation
Security
Observability
```

Also remove root named exports from these modules.

### Add to `reply`

```ts
reply.navigate(url, options?)
```

Recommended shape:

```ts
interface NavigateOptions extends reply.BodyOptions {
  readonly baseUrl?: string | URL
  readonly allowedOrigins?: readonly string[]
  readonly attributes?: Readonly<Record<string, string | number | boolean>>
}
```

Behavior:

- validate and normalize `url` internally;
- reject control characters;
- reject non-HTTP(S) protocols;
- default to same-origin navigation relative to `baseUrl ?? "http://localhost"`;
- allow external destinations only when their origin is included in `allowedOrigins`;
- return a Datastar-safe direct script response equivalent to:

```ts
reply.direct.script(`window.location.href = ${JSON.stringify(safeUrl)}`)
```

Do not expose `safeRedirectUrl` publicly unless a later concrete use case needs it outside `reply.navigate`.

## Validation decision

Validation stays as a pattern, not a public module.

Keep the validation-form example, but move helper definitions into the example or recipe:

- app-local `FormValidationError`;
- app-local `ValidationIssue` type;
- app-local `_validation` signal payload builder;
- app-local clear/null-removal helper if needed;
- responses built with `reply.signals(...)` or `reply.patch(...)` directly.

The docs may bless the **pattern**:

- use local/private signals such as `_validation.email`;
- return `200` Datastar patches for recoverable validation errors;
- keep durable form/domain state on the backend;
- decode untrusted inputs with Effect Schema at the request boundary.

But do not bless framework-owned validation error classes yet.

## Security decision

Delete or internalize request-policy and identity helpers:

- `AuthContext`;
- `AuthContextLive`;
- `requireUser`;
- `requireCsrfToken`;
- request size helpers;
- request abort helpers if they depend on old runtime context;
- broad `SafeUrlOptions` / `safeRedirectUrl` public API.

Security docs should say:

- Datastar signals/query/form/body are untrusted input;
- auth/session belongs to the application;
- CSRF and request size limits usually belong in router/middleware policy;
- use `reply.navigate(...)` for Datastar-driven client navigation instead of hand-rolled script strings.

## Observability decision

Remove the custom public telemetry facade:

- `Telemetry`;
- `NoopTelemetryLive`;
- `makeInMemoryTelemetry`;
- `withSpan`;
- `observeRequest`;
- `observeDecode`;
- `observeRender`;
- `observeStream`.

Delete tests that only protect these APIs.

Keep quality/testing guidance by rewriting or renaming observability docs to focus on:

- real Datastar runtime/browser tests;
- SSE protocol fixture tests;
- request/response integration tests;
- Effect/OpenTelemetry as the recommended app-level observability path.

## Implementation work

- Remove `Validation`, `Security`, and `Observability` from `src/index.ts`.
- Delete or stop exporting `src/validation.ts`, `src/security.ts`, and `src/observability.ts` as public modules.
- Add `reply.navigate(...)` and internal URL validation helpers.
- Rewrite validation-form example with app-local validation helpers.
- Delete or rewrite validation/security/observability tests that assert removed public APIs.
- Keep tests for `reply.navigate(...)` URL safety.
- Rewrite docs:
  - validation as recipe/pattern;
  - security as boundary guidance, not API catalog;
  - observability docs into testing guidance plus Effect/OTel recommendation.

## Acceptance criteria

- No public root `Validation`, `Security`, or `Observability` namespaces remain.
- Recoverable validation is still demonstrated clearly without framework-owned validation classes.
- `reply.navigate(...)` safely supports Datastar-driven navigation.
- Open redirects are rejected by default.
- Auth/session/CSRF/request limits are documented as app-owned policy concerns.
- No custom telemetry facade remains public.
- Browser/runtime testing guidance remains available.

## Anti-goals

- Do not create a plugin system for validation/security/telemetry.
- Do not keep empty compatibility shims.
- Do not expose a broad `Security` namespace for two pure helpers.
- Do not add framework-owned auth/session state.
- Do not make validation helpers look like the only blessed way to model domain errors.
- Do not create a generic script-response abstraction beyond existing `reply.direct.script` and specific `reply.navigate`.
