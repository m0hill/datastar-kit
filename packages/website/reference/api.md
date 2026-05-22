# API reference

Datastar Kit exposes a small public surface through the package root plus a few explicit subpaths.

## Import style

Use contextual namespaces for larger concepts:

```tsx
import { ds, event, read, reply } from 'datastar-kit'
```

Configure JSX consumers with `jsx: "react-jsx"` and `jsxImportSource: "datastar-kit"`.

## Root namespaces

- `ds` — Datastar attributes, actions, signal refs, signal-state helpers, expression helpers, and modifiers.
- `event` — rendered Datastar SSE event chunks (`patch`, `signals`, `script`) for `reply.stream(...)`; signal chunks take signal-state objects.
- `read` — Datastar JSON object signal decoding from native `Request` values.
- `reply` — native `Response` helpers for pages, SSE patches, direct responses, navigation, streams, and no-content command completion.

## Signal state helpers

- `ds.state(defaults)` — creates a small helper from one object of initial signal values. Use `state.attrs()` for `data-signals`, `state.$` or `state.refs` for nested typed signal refs, `state.patch(...)` for type-checked partial signal patches, and `state.reset(...)` for default reset payloads.
- `ds.signal(name)` — creates a standalone typed signal ref. Use this directly for isolated signals or when you deliberately want to address a dotted path such as `"errors.name"`.
- `ds.local(name)` — creates an underscore-prefixed local/private signal ref.

## Root HTML helpers

- `h` — low-level HTML node factory.
- `mergeProps` — merge prop objects left-to-right.
- `renderToString` — render Datastar Kit HTML nodes/JSX output to a string.
- `unsafeHtml` — explicit trust-boundary escape hatch for already-safe HTML.

## Explicit subpaths

- `datastar-kit/sse` — low-level event encoding (`patchElements`, `patchSignals`, `executeScript`) for protocol tests and custom encoders, including raw serialized signal patch source when needed.
- `datastar-kit/jsx-runtime` / `datastar-kit/jsx-dev-runtime` — TypeScript automatic JSX runtime entrypoints.

Related guides: [Actions and responses](../guides/actions-and-responses.md), [Signals](../guides/signals.md), [HTML and JSX](../guides/html-and-jsx.md).
