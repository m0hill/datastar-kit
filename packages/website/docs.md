# Datastar Kit documentation

This page is the map. Start with [Getting Started](index.md) for install and a quick counter, then use the sections below when you need the deeper version of a topic.

## Recommended reading order

### 1. Concepts

1. [Programming model](concepts/programming-model.md) — the server-driven shape: pages, commands, queries, live views, and invalidations.
2. [Runtime boundaries](concepts/runtime-boundaries.md) — what Datastar Kit owns, and what stays in your app.

### 2. Core guides

3. [HTML and JSX](guides/html-and-jsx.md) — views, layouts, named slots, data loading, escaping, and low-level HTML helpers.
4. [Signals](guides/signals.md) — authoring, reading, and patching browser signal state.
5. [Actions and responses](guides/actions-and-responses.md) — command flow, status semantics, response helpers, and request bodies.
6. [Patch elements](guides/patch-elements.md) — stable IDs, selectors, and DOM patch modes.
7. [Validation and errors](guides/validation-and-errors.md) — app-owned schema validation and recoverable UI feedback.
8. [Realtime streams](guides/realtime.md) — app-owned live views with `reply.stream(...)`.

### 3. Operations

9. [Security](guides/security.md) — auth, CSRF, ownership checks, and safe navigation boundaries.
10. [Deployment](guides/deployment.md) — runtime adapters, Datastar assets, SSE proxy settings, and smoke tests.
11. [Testing](guides/testing.md) — request/response tests, protocol tests, and browser-runtime tests.
12. [Examples](guides/examples.md) — workspace examples and what they demonstrate.
13. [Agents](guides/agent.md) — how to vendor Datastar Kit source as read-only reference material for coding agents.

### 4. Reference

- [API reference](reference/api.md) — public modules, root exports, and explicit subpaths.
- [Architecture](reference/architecture.md) — source layout and contributor-oriented design notes.

## Documentation style

The user-facing path is: Getting Started -> Concepts -> Core guides -> Operations -> Reference. Design details and contributor-facing notes should live under `reference/`, not in the first-run learning path.
