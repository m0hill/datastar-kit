# T012 — Define extensibility and public API stabilization

## Status

`done`

## Why this task exists

Frameworks need extension points, but extension systems can become accidental complexity. `ts-star` should allow users to bring their own renderer, realtime backend, security/session layer, and domain services without turning into a plugin-heavy frontend framework clone.

## Target outcome

Define a small set of stable extension points and a clear public API boundary.

## Public/internal split

Decide which modules are stable public API:

- Datastar attribute/action helpers?
- SSE protocol helpers?
- Platform response helpers?
- Runtime/page/command APIs?
- HTML builder?
- JSX factory?

Everything else should either be internal or explicitly experimental.

## Extension points to consider

### Renderer

Users should be able to use external templating or JSX/hyperscript without rewriting framework runtime.

### Datastar client asset

Support CDN, self-hosted pinned asset, cache-control, integrity/versioning later.

### Realtime backend

Core should not require a broker. Provide interfaces for PubSub, database notifications, NATS, Redis, etc.

### Security/session/auth

Framework should integrate with app-specific auth rather than own it entirely.

### Error mapping

Apps need domain-specific error-to-response behavior.

### Telemetry

Provide hooks or services, not a required backend.

## Implementation work

- Add public API document.
- Mark experimental modules in docs and exports.
- Decide whether `index.ts` should export everything or curated APIs only.
- Introduce service interfaces for renderer/realtime/security/error mapping.
- Add versioning/deprecation policy before publishing.
- Avoid scopes like `fix(ui):`; keep package changes clean and reviewable.

## Acceptance criteria

- Users know which imports are stable.
- Extension points are Effect-friendly.
- Internal implementation can change without breaking users.
- The framework can grow without putting everything in `src/index.ts` forever.
- No extension point requires adopting a huge plugin architecture.

## Anti-goals

- Do not build plugin discovery.
- Do not support every renderer/realtime backend in core.
- Do not freeze experimental APIs too early.
