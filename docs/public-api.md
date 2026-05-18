# Public API direction

`ts-star` is pre-release. The current goal is one clear blessed path, not compatibility with earlier prototype APIs.

## Import style

Use contextual namespaces for larger concepts and top-level names only for the tiny HTML authoring surface:

```ts
import { ds, read, reply, contract, live, h, props } from "ts-star"
```

## Current blessed path

- `ds` — Datastar attributes/actions/signals.
- `read` — request-boundary decoding.
- `reply` — response helpers. SSE patch responses are the default path.
- `contract` — narrow schema-derived signal contracts.
- `live` — current-state live query event streams that compose with `reply.stream`.
- `h`, `render`, `fragment`, `raw`, `props`, `page` — tiny server HTML boundary.

## JSX status

JSX is an explicit experimental adapter, not a root API and not a component runtime. If used, import it deliberately from the adapter/subpath. JSX function components are plain server render functions only.

## Internal or recipe-only concerns

There is no public `Client` namespace. Datastar runtime inclusion is explicit HTML in the page head; apps choose a pinned CDN URL or their own static serving.

Validation is a recipe/pattern, not a public namespace. Auth/session/CSRF/request policy belongs to the application. Observability should use Effect/OpenTelemetry directly rather than a `ts-star` facade.

Do not add new root exports by default. Implementation-only helpers should stay unexported or move under an internal path.

## Extension posture

Do not add plugin discovery or adapter interfaces before there is real pressure.

For external renderers, render to a string and pass it to `reply.page({ body: rendered })` / `reply.patch(...)`. There is no public renderer interface yet.

## What not to add

Do not add:

- plugin discovery/registration;
- renderer-specific core dependencies;
- broker-specific realtime dependencies;
- a required auth/session framework;
- frontend-store abstractions;
- compatibility aliases before users exist.
