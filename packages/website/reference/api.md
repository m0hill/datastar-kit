# API reference

Datastar Kit exposes a small public surface through the package root plus a few explicit subpaths.

## Import style

Use contextual namespaces for larger concepts:

```tsx
import { ds, event, read, reply } from 'datastar-kit'
```

Configure JSX consumers with `jsx: "react-jsx"` and `jsxImportSource: "datastar-kit"`.

## Root namespaces

- `ds` — Datastar attributes, actions, signal refs, expression helpers, and modifiers.
- `event` — rendered Datastar SSE event chunks (`patch`, `signals`, `script`) for `reply.stream(...)`.
- `read` — Datastar JSON object signal decoding from native `Request` values, with optional Standard Schema validation.
- `reply` — native `Response` helpers for pages, SSE patches, direct responses, navigation, streams, and no-content command completion.

## Root HTML helpers

- `h` — low-level HTML node factory.
- `mergeProps` — merge prop objects left-to-right.
- `renderToString` — render Datastar Kit HTML nodes/JSX output to a string.
- `unsafeHtml` — explicit trust-boundary escape hatch for already-safe HTML.

## Explicit subpaths

- `datastar-kit/sse` — low-level event encoding (`patchElements`, `patchSignals`, `executeScript`) for protocol tests and custom encoders.
- `datastar-kit/jsx-runtime` / `datastar-kit/jsx-dev-runtime` — TypeScript automatic JSX runtime entrypoints.

Related guides: [Actions and responses](../guides/actions-and-responses.md), [Signals](../guides/signals.md), [HTML and JSX](../guides/html-and-jsx.md).
