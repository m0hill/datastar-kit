# Public API direction

`ts-star` is pre-release. The Web Standards branch prioritizes one clear SDK path over compatibility with the earlier prototype API.

## Import style

Use contextual namespaces for larger concepts and top-level names only for the tiny HTML authoring surface:

```ts
import { ds, event, read, reply, h, props } from "ts-star"
```

## Current blessed path

- `ds` — Datastar attributes/actions/signals.
- `event` — rendered Datastar SSE event chunks for `reply.stream(...)`.
- `read` — Datastar signal decoding from a native `Request` with Standard Schema validation.
- `reply` — native `Response` helpers for Datastar page, SSE, direct response, navigation, stream, and no-content semantics.
- `h`, `render`, `fragment`, `raw`, `props`, `page` — tiny server HTML boundary.

Low-level SSE encoding is available from `ts-star/sse`; JSX is available from `ts-star/jsx`. Neither `sse` nor JSX are root exports.

## Removed from core

- schema-derived signal contracts;
- live-query runtime helpers;
- router/middleware/context abstractions;
- platform adapters;
- validator-specific APIs.

Validation is exposed only where the SDK owns a boundary: `read.signals(request, schema)`. Applications can use any Standard Schema-compatible validator.

## Extension posture

Do not add plugin discovery or adapter interfaces before there is real pressure. For external renderers, render to a string and mark it as trusted HTML with `raw(rendered)` before passing it to response helpers.
