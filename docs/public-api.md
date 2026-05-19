# Public API direction

`ts-star` is pre-release. The Web Standards branch prioritizes one clear SDK path over compatibility with the earlier prototype API.

## Import style

Use contextual namespaces for larger concepts. Server-side JSX is the blessed view-authoring path; the top-level HTML helpers remain the low-level primitive surface.

```tsx
import { ds, event, read, reply } from "ts-star"
```

Configure JSX consumers with `jsx: "react-jsx"` and `jsxImportSource: "ts-star"`.

## Current blessed path

- `ds` — Datastar attributes/actions/signals.
- `event` — rendered Datastar SSE event chunks for `reply.stream(...)`.
- `read` — Datastar signal decoding from a native `Request` with Standard Schema validation.
- `reply` — native `Response` helpers for Datastar page, SSE, direct response, navigation, stream, and no-content semantics.
- automatic JSX runtime from `ts-star/jsx-runtime` — blessed server view authoring over the same HTML node model.

Low-level SSE encoding is available from `ts-star/sse`. JSX factories and the internal JSX adapter are not public exports.

## Removed from core

- schema-derived signal contracts;
- live-query runtime helpers;
- router/middleware/context abstractions;
- platform adapters;
- validator-specific APIs.

Validation is exposed only where the SDK owns a boundary: `read.signals(request, schema)`. Applications can use any Standard Schema-compatible validator.

## Extension posture

Do not add plugin discovery or adapter interfaces before there is real pressure. For external renderers, render to a string and mark it as unsafe HTML with `unsafeHtml(rendered)` before passing it to response helpers.
