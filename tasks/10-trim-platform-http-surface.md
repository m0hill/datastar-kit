# T010 — Delete Platform as public API and keep only `read.signals`

## Status

`pending`

## Grill level

`4/5` — major public-shape decision, now settled by grill discussion.

## Settled decisions

1. `Platform` must not remain a public app-facing namespace.
2. Do not expose a `router(...)` / `platformRouter(...)` helper from `ts-star`.
3. Examples should use Effect Platform routing directly, even if that is more verbose.
4. `read` should expose only Datastar signal decoding.
5. Delete `read.query` and all explicit-request `*From` variants.
6. Delete generic urlencoded/form/multipart/body readers.
7. Do not expose low-level helpers such as `isDatastarRequest`, raw signal parsing, JSON parsing, or query-object extraction.
8. Do not keep a custom framework parse error class.
9. Invalid signal JSON should surface through standard Effect Schema parsing/decoding errors, not `SignalJsonError` or another ts-star error type.
10. `read.signals(schema)` must support all Datastar signal transports internally:
    - GET/DELETE: `?datastar=...` query parameter;
    - POST/PUT/PATCH/etc.: request body JSON.
11. Delete `src/platform.ts` as a public-shaped module. Move only needed internals into `read.ts` or `src/internal/read.ts`.

## Why this task exists

After T003–T009, the framework shape is intentionally small:

```ts
import { contract, ds, h, live, props, read, reply } from "ts-star"
```

A public `Platform` namespace pulls the framework back toward being a generic Effect Platform wrapper. It also preserves older names such as `platformReadSignals`, `platformReadQuery`, and `platformRouter`, which conflict with the newer contextual API style.

The only input helper that has clearly earned its place is `read.signals(schema)`, because Datastar signal transport differs by HTTP method and the framework can hide that detail without inventing a larger request abstraction.

## Target public API

Keep:

```ts
read.signals(schema)
```

Remove from public API:

```ts
Platform
platformRouter
platformReadSignals
platformReadSignalsFromRequest
platformReadQuery
platformReadQueryFromRequest
platformReadUrlEncodedForm
platformReadUrlEncodedFormFromRequest
platformReadForm
platformReadFormFromRequest
platformReadMultipart
platformReadMultipartFromRequest
isDatastarRequest
parseSignalsJson
platformRawSignalsFromRequest
platformQueryFromRequest
SignalJsonError
QueryObject
QueryValue
UrlEncodedFormInput
PlatformResponseOptions
```

Also remove:

```ts
read.query
read.queryFrom
read.signalsFrom
```

## Recommended implementation shape

### `read.signals`

`read.signals(schema)` should:

1. access the current Effect Platform `HttpServerRequest` service;
2. read the Datastar signal payload according to request method;
3. parse JSON through Effect Schema machinery;
4. decode with the provided schema;
5. fail with standard Effect/Schema errors, not a custom ts-star parse error.

The implementation may keep private helpers, but they should not be root-exported or documented as public API.

### Routing

Examples should import Effect Platform directly:

```ts
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"

const router = HttpRouter.addAll([
  HttpRouter.route("GET", "/", page),
  HttpRouter.route("POST", "/increment", increment)
])

export const app = Effect.flatten(HttpRouter.toHttpEffect(router))
```

Use the exact Effect Platform style that typechecks best, but do not wrap it in a `ts-star` public helper.

## Implementation work

- Remove `Platform` namespace from `src/index.ts`.
- Remove root named exports from `platform.ts` by deleting the file or moving internals.
- Delete `platformRouter` and update examples/tests to use Effect Platform directly.
- Delete `read.query`, `read.queryFrom`, and `read.signalsFrom`.
- Delete form/urlencoded/multipart wrappers and their tests unless rewritten as direct Effect Platform tests outside ts-star scope.
- Remove `SignalJsonError` and parse helper exports.
- Ensure `read.signals` still supports GET/DELETE query-param signals and body-based signals.
- Rewrite docs that mention `Platform`, `platform*`, or `read.query`.
- Keep or add focused tests for `read.signals` transport behavior.

## Acceptance criteria

- Public input API is only `read.signals(schema)`.
- No `Platform` namespace or `platform*` helpers are exported from package root.
- No ts-star router helper remains.
- No generic form/query/multipart wrappers remain.
- Invalid signal JSON is represented as standard Schema parsing/decoding failure.
- GET/DELETE Datastar signal payloads and body Datastar signal payloads both decode through `read.signals`.
- Examples compile using Effect Platform routing directly.

## Anti-goals

- Do not wrap every Effect Platform helper for convenience.
- Do not introduce `read.form`, `read.body`, `read.query`, or `read.multipart` without a concrete framework-level story.
- Do not keep `Platform` as an advanced public escape hatch.
- Do not keep compatibility aliases for old `platform*` names.
