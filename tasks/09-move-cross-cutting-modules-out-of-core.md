# T009 — Move Security, Validation, and Observability out of public core

## Status

`pending`

## Grill level

`5/5` — identity-defining decision.

## Why this task exists

`Security`, `Validation`, and `Observability` are real application concerns, but public framework modules for them make `ts-star` feel like a generic enterprise web framework. They also add conventions before the framework has users.

The core should provide clean request/response primitives. App-specific auth, validation UX, and telemetry can be recipes until repeated real use proves a stable abstraction.

## Recommended answer

Remove these modules from public API. Keep only tiny internal helpers if core code needs them. Move examples to docs/recipes if they demonstrate useful patterns.

## Grill questions before implementation

1. Should validation signal conventions be blessed now?
   - Recommended answer: no; keep as a recipe.
2. Should auth/session be modeled by framework services?
   - Recommended answer: no; apps own auth/session.
3. Should telemetry use a custom facade?
   - Recommended answer: no; use Effect/OpenTelemetry integration when real instrumentation exists.

## Removal/internal candidates

### Security

- `AuthContext`
- `AuthContextLive`
- `requireUser`
- `requireCsrfToken`
- request size helpers
- redirect/script helpers

### Validation

- `FormValidationError`
- `ActionError`
- fixed `_validation` payload helpers
- validation summary/action error HTML nodes
- `recoverValidation`

### Observability

- `Telemetry` service
- `NoopTelemetryLive`
- `makeInMemoryTelemetry`
- `withSpan`/`observe*` wrappers

## Implementation work

- Remove namespaces from root exports.
- Move selected code to examples/recipes or `src/internal` if still needed.
- Remove or rewrite tests that only assert public existence.
- Update docs to say these are application concerns, not core framework commitments.
- Ensure examples still show validation/security patterns only if they remain simple and explicitly non-core.

## Acceptance criteria

- Public API no longer suggests bundled auth/security/validation/telemetry subsystems.
- The framework still has enough primitives for users to implement these concerns explicitly.
- No custom telemetry/auth abstraction remains just in case.

## Anti-goals

- Do not build plugin hooks for these concerns.
- Do not preserve old module names as empty shims.
- Do not remove all documentation of patterns; just avoid public core APIs.
