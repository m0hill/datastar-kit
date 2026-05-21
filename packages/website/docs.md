# Datastar Kit documentation

This is the longer-form documentation for Datastar Kit. Start with the package [README](index.md) for install and a quick counter, then read these pages in order as needed.

## Recommended reading order

### 1. Concepts

1. [Programming model](concepts/programming-model.md) — backend-owned state, commands, queries, and the Datastar mental model.
2. [Runtime boundaries](concepts/runtime-boundaries.md) — how Datastar Kit fits into your app's handlers and services.

### 2. Core guides

3. [HTML and JSX](guides/html-and-jsx.md) — server-rendered views, layouts, named slots, loader/view splits, escaping, and low-level HTML helpers.
4. [Signals](guides/signals.md) — authoring, reading, validating, and patching Datastar signals.
5. [Actions and responses](guides/actions-and-responses.md) — action flow, response helpers, status semantics, and selector usage.
6. [Patch elements](guides/patch-elements.md) — visual guide to `outer`, `inner`, `append`, `remove`, and other DOM patch modes.
7. [Validation and errors](guides/validation-and-errors.md) — Standard Schema validation and recoverable UI feedback.
8. [Realtime streams](guides/realtime.md) — app-owned live query recipes with `reply.stream(...)`.

### 3. Operations

9. [Security](guides/security.md) — auth, CSRF, ownership checks, and safe navigation boundaries.
10. [Deployment](guides/deployment.md) — runtime adapters, Datastar assets, SSE proxy settings, and smoke tests.
11. [Testing](guides/testing.md) — request/response tests, protocol tests, and browser-runtime tests.
12. [Examples](guides/examples.md) — workspace examples and what they demonstrate.

### 4. Reference

- [API reference](reference/api.md) — public modules, root exports, and explicit subpaths.
- [Architecture](reference/architecture.md) — source layout and contributor-oriented design notes.

## Documentation style

The user-facing path is: README → Concepts → Core guides → Operations → Reference. Design details and contributor-facing notes should live under `reference/`, not in the first-run learning path.
