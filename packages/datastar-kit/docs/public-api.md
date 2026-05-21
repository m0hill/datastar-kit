# Public API direction

Datastar Kit is pre-release. The Web Standards branch prioritizes one clear SDK path over compatibility with the earlier prototype API.

## Import style

Use contextual namespaces for larger concepts. Server-side JSX is the blessed view-authoring path; the top-level HTML helpers remain the low-level primitive surface.

```tsx
import { ds, event, read, reply } from "datastar-kit"
```

Configure JSX consumers with `jsx: "react-jsx"` and `jsxImportSource: "datastar-kit"`.

## Current blessed path

- `ds` — Datastar attributes/actions/signals.
- `event` — rendered Datastar SSE event chunks for `reply.stream(...)`.
- `read` — Datastar JSON object signal decoding from a native `Request`, with optional Standard Schema validation.
- `reply` — native `Response` helpers for Datastar page, SSE, direct response, navigation, stream, and no-content semantics.
- automatic JSX runtime from `datastar-kit/jsx-runtime` — blessed server view authoring over the same HTML node model.

Low-level SSE encoding is available from `datastar-kit/sse`. JSX factories and the internal JSX adapter are not public exports.

## Removed from core

- schema-derived signal contracts;
- live-query runtime helpers;
- router/middleware/context abstractions;
- platform adapters;
- validator-specific APIs.

Signal decoding is exposed where the SDK owns a boundary: `read.signals(request)` parses JSON object signal state, and `read.signals(request, schema)` validates it with any Standard Schema-compatible validator.

## Extension posture

Do not add plugin discovery or adapter interfaces before there is real pressure. For external renderers, render to a string and mark it as unsafe HTML with `unsafeHtml(rendered)` before passing it to response helpers.
