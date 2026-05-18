# Public API direction

`ts-star` is pre-release. The current goal is one clear blessed path, not compatibility with earlier prototype APIs.

## Import style

Use contextual namespaces for larger concepts and top-level names only for the tiny HTML authoring surface:

```ts
import { ds, read, reply, contract, h, props } from "ts-star"
```

## Current blessed path

- `ds` — Datastar attributes/actions/signals.
- `read` — request-boundary decoding.
- `reply` — response helpers. SSE patch responses are the default path.
- `contract` — narrow schema-derived signal contracts.
- `h`, `render`, `fragment`, `raw`, `props`, `page` — tiny server HTML boundary.

## JSX status

JSX is an explicit experimental adapter, not a root API and not a component runtime. If used, import it deliberately from the adapter/subpath. JSX function components are plain server render functions only.

## Internal or still under cleanup

The simplification roadmap is still deciding the final status of `Client`, `Model`, `Realtime`, `Security`, `Validation`, and `Observability`.

Do not add new root exports by default. Implementation-only helpers should stay unexported or move under an internal path.

## Extension posture

Do not add plugin discovery or adapter interfaces before there is real pressure.

For external renderers, render to a string and pass it to `reply.page(...)` / `reply.patch(...)`. There is no public renderer interface yet.

## What not to add

Do not add:

- plugin discovery/registration;
- renderer-specific core dependencies;
- broker-specific realtime dependencies;
- a required auth/session framework;
- frontend-store abstractions;
- compatibility aliases before users exist.
