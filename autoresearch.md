# Autoresearch: Web Standards core migration

## Objective

Convert the experimental `experiment/web-standards-core` branch from an Effect-native Datastar package into a Web Standards-first Datastar SDK. The target is not benchmark-specific performance; it is migration completeness while preserving tested behavior. Do not cheat by weakening tests, deleting meaningful protocol coverage, or hiding Effect references from the metric.

## Metrics

- **Primary**: `migration_debt` (unitless, lower is better) — forbidden Effect library/runtime references in code/package files plus public root exports that belong to the old Effect-oriented core. Datastar's `data-effect` attribute is not counted.
- **Secondary**: `forbidden_effect_refs`, `old_root_exports`, `src_bytes`, `test_files` — tradeoff monitors for migration completeness and accidental deletion.

## How to Run

`./autoresearch.sh` — outputs `METRIC name=value` lines.

`autoresearch.checks.sh` runs typecheck, tests, and build after the metric command succeeds. Checks must pass before a migration step is kept.

## Files in Scope

- `src/ds.ts` — Datastar expression and attribute DSL; should remain mostly pure.
- `src/html.ts` — tiny HTML node/rendering API; should remain pure.
- `src/jsx.ts` — explicit server-only JSX adapter; should remain pure.
- `src/sse.ts` — low-level Datastar SSE event encoding; should remain pure.
- `src/read.ts` — rewrite around `Request`, `URL`, body text, and Standard Schema.
- `src/reply.ts` — rewrite around native `Response`, `Headers`, and `ReadableStream`.
- `src/index.ts` — root exports should become `ds`, `read`, `reply`, and HTML helpers only.
- `examples/**` — rewrite examples as fetch-compatible handlers; add Hono as example-only integration; remove Effect-only runtime example.
- `test/**` — replace Effect Platform tests with Web Request/Response tests without reducing protocol coverage.
- `docs/**`, `README.md`, `CONTEXT.md` — update terminology and usage guidance for the Web Standards SDK direction.
- `package.json`, `pnpm-lock.yaml`, `tsconfig.json` — remove Effect deps, add Standard Schema spec, and add example-only dev deps as needed.

## Off Limits

- Do not modify the existing Effect branch; this work stays on `experiment/web-standards-core`.
- Do not add a core router, middleware system, dependency injection context, runtime, PubSub, or framework adapter.
- Do not hardcode Zod, Hono, Effect Schema, or any validator/framework into `src/**`.
- Do not weaken Datastar status/SSE semantics to make tests pass.
- Do not remove meaningful Datastar DSL/SSE/HTML behavior just to reduce code size or metric counts.

## Constraints

- Core must not import or depend on `effect` or `@effect/*`.
- Core validation must accept Standard Schema via `@standard-schema/spec` types only.
- `read.signals(request, schema)` requires a schema, returns parsed output, and throws typed errors on bad JSON/schema issues.
- `reply.*` helpers return native `Response` objects.
- Datastar action helpers own their required statuses; helper options omit `status` except `reply.page`, which is normal HTTP.
- `reply.stream` accepts iterable/async-iterable/Web Stream event sources and uses millisecond heartbeat options.
- First-party examples export plain fetch-compatible handlers; Hono remains example/dev-dependency only.
- Run `pnpm run typecheck`, `pnpm run test`, and `pnpm run build` before keeping changes.

## What's Been Tried

- Planning/grilling resolved the API boundary: `ts-star` is a Web Standards SDK, not an application framework.
- Hono is allowed only as an example integration; no Hono-specific core API.
- `contract` and `live` are removed from core rather than reimplemented as weaker non-Effect abstractions.
