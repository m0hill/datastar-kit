# Docs map

Start with [Introduction](index.md) if you are new to Datastar Kit. After that, the docs are organized by how people usually adopt the SDK: understand the model, build one interaction, then add validation, realtime behavior, and production concerns.

## Learn the model

1. [Programming model](concepts/programming-model.md) explains the server-driven loop: pages, actions, commands, queries, patches, signals, and live views.
2. [Runtime boundaries](concepts/runtime-boundaries.md) defines what Datastar Kit owns and what stays in your app or framework.

## Build UI

3. [HTML and JSX](guides/html-and-jsx.md) covers server-rendered views, layouts, data loading, escaping, and the low-level HTML helpers.
4. [Signals](guides/signals.md) covers browser-side signal state, typed refs, request decoding, and signal patches.
5. [Actions and responses](guides/actions-and-responses.md) shows how browser events become HTTP handlers and how to choose the right `reply.*` helper.
6. [Element patches](guides/patch-elements.md) explains stable IDs, selectors, patch modes, removal, and view transitions.

## Add app behavior

7. [Validation](guides/validation-and-errors.md) shows the app-owned decode-then-validate pattern and user-facing error patches.
8. [Realtime](guides/realtime.md) explains current-state live views with `reply.stream(...)` and app-owned invalidation sources.

## Operate it

9. [Security](guides/security.md) covers trust boundaries, auth, CSRF, ownership checks, and safe navigation.
10. [Deployment](guides/deployment.md) covers runtime adapters, Datastar assets, SSE proxy settings, and production checks.
11. [Testing](guides/testing.md) covers request/response tests and protocol-level verification.

## Reference

- [API reference](reference/api.md) lists the public modules and the main helpers in each namespace.
- [Examples](guides/examples.md) maps runnable workspace examples to the concepts they demonstrate.
- [Architecture](reference/architecture.md) describes source layout and contributor-facing design constraints.
- [Agent setup](guides/agent.md) shows how to vendor the repository as read-only reference material for coding agents.
