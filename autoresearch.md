# Autoresearch: ts-star framework roadmap

## Objective

Implement the roadmap in `tasks/tasks.json` in dependency order, turning the current Datastar + Effect prototype into a coherent server-driven framework. The loop should complete each task by delivering the requested docs/code/tests, then mark that task done only after its acceptance criteria are actually satisfied.

## Metrics

- **Primary**: `completed_tasks` (count, higher is better) — number of roadmap tasks marked `done` in `tasks/tasks.json`.
- **Secondary**:
  - `pending_tasks`, `running_tasks`, `blocked_tasks`, `deferred_tasks` — roadmap status visibility.
  - `status_mismatches` — Markdown task status must match `tasks.json`.
  - `dependency_violations` — a done task must not depend on a non-done task.

## How to Run

`./autoresearch.sh` — validates the roadmap tracker and outputs `METRIC name=value` lines.

Correctness backpressure is in `./autoresearch.checks.sh`, which runs TypeScript and Vitest after each successful benchmark.

## Files in Scope

- `README.md` — public project overview and examples.
- `docs/**` — architecture/design documents produced by roadmap tasks.
- `src/**` — framework/runtime/source changes required by later tasks.
- `test/**` — validation for behavior and examples.
- `examples/**` — reference apps and executable examples.
- `tasks/tasks.json` and `tasks/*.md` — roadmap status must stay in sync with real implementation progress.
- `autoresearch.md`, `autoresearch.sh`, `autoresearch.checks.sh`, `autoresearch.ideas.md` — session memory and benchmark harness.

## Off Limits

- Do not inflate `completed_tasks` by changing statuses without delivering the task acceptance criteria.
- Do not weaken tests, remove meaningful assertions, or alter the benchmark to hide regressions.
- Do not modify `dist/**`; generated output is not the source of truth.
- Do not replace Datastar or Effect with unrelated dependencies.

## Constraints

- Follow task dependency order from `tasks/tasks.json` unless a task is explicitly blocked/deferred with rationale.
- Keep the project small and layered; do not introduce plugin systems or broad abstractions before the architecture baseline calls for them.
- Preserve existing public low-level helpers unless a task explicitly replaces them with a documented migration path.
- `pnpm run typecheck` and `pnpm run test` must pass for kept changes.
- Treat Datastar as the browser runtime/patch protocol and Effect as the lifecycle/runtime model.

## What's Been Tried

- Session initialized from `tasks/tasks.json`; no tasks completed yet.
- T001 implemented with a rewritten `README.md` and new `docs/architecture.md` documenting layered architecture, public/experimental/internal API boundaries, foundational/flexible decisions, default request flow, and non-goals. Tracker status updated to `done` only after the deliverables were present.
- T002 implemented Datastar-safe action response helpers (`datastar*Response` for 200 bodies and `datastarNoContentResponse` for 204), added URL-encoded/form/multipart decoding wrappers, documented protocol/form semantics in `docs/datastar-protocol.md`, migrated examples toward safe helpers, and added unit plus real-browser `agent-browser` runtime tests.
- T003 added `docs/programming-model.md` and a minimal `src/model.ts` CQRS surface (`commandDone`, `currentViewPatchResponse`, `liveQuery`, `liveQueryResponse`). The live counter now uses backend `count` state plus void invalidations and rerenders current state on connect/reconnect instead of streaming fragile event deltas.
- T004 inspected Effect repo examples (`packages/platform-node/examples/http-router.ts`, `http-tag-router.ts`, and `api.ts`) before implementing `src/runtime.ts` service/layer boundaries. Added `docs/runtime.md`, `examples/runtime-counter.ts`, and tests proving layered app assembly, request-scoped signal decoding, typed error mapping, scoped live-query hub shutdown, and compile-time missing-service pressure.
- T005 added `src/contracts.ts` and `docs/type-contracts.md`: `defineSignals` derives handles, initial attributes, decoders, runtime-service decode, typed patches, and patch responses from one Effect Schema; `defineAction`/`defineQueryAction` prototype route/action URL contracts. `examples/runtime-counter.ts` now defines its signal schema once through the contract.
- T006 added the HTML rendering boundary in `src/html.ts`: `Renderer`, default `htmlRenderer`, ordered `attrs`/`mergeOrderedAttrs`, explicit `rawHtml`, and patchable ID helpers. `docs/html-rendering.md` records renderer/JSX status, safe vs raw HTML policy, attribute ordering, and morph-by-id guidance.
- T007 added `docs/signals.md` and signal-intent helpers (`inputSignal`, `privateSignal`/`localSignal`, `validationSignal`, `loadingSignal`, plus scoped data helpers). Counter and TSX counter now keep count as backend state and patch elements; live counter no longer initializes unused count signal. Tests cover private/local naming, validation/loading scopes, and stale client payloads not controlling backend count.
- T008 added `docs/live-queries.md` and enhanced the live query prototype with `LiveQuery.make/response`, render-on-connect default, optional render-on-connect disable, heartbeat response integration, and invalidation coalescing via bounded Stream buffers. Existing live-counter remains the current-state reconnect-safe example.
- T009 added `src/security.ts` and `docs/security.md`: CSRF header hook, AuthContext/requireUser, content-length and post-read body size checks, request abort signal access, safe redirect/navigation helpers, and default ErrorMapper mappings for security errors.
- T010 added `src/validation.ts`, `docs/errors-validation.md`, and `examples/validation-form.ts`: typed `FormValidationError`/`ActionError`, `_validation` signal payload conventions, 200 Datastar validation signal/summary/action-error patch helpers, and reference form tests covering success, recoverable validation failure, and malformed decode failure.
- T011 added `src/observability.ts` and `docs/observability-testing.md`: Telemetry/TelemetrySpan boundary, noop runtime layer, in-memory test telemetry, span helpers for requests/decode/render/streams, and tests for success/error spans and stream close. Existing agent-browser Datastar runtime test remains the real-browser protocol check.
- T012 added `docs/public-api.md` defining stable candidates vs experimental modules, namespace import guidance, internal-code policy, Effect-friendly extension points for renderer/client asset/realtime/security/error mapping/telemetry, and versioning/deprecation policy. Root export tests now cover all public namespaces.
- T013 added reference documentation pages (`docs/examples.md`, `docs/datastar-philosophy.md`, `docs/actions-commands.md`, `docs/deployment.md`, `docs/api-reference.md`), expanded package/dev scripts for runtime-counter and validation-form examples, added a browser integration test for the backend-state counter reference example, and enhanced search with an explicit empty state.
- T014 added `docs/performance-deployment.md`, linked deployment/live-query performance guidance, made Datastar client asset helpers accept custom cache headers, and added tests for cache header behavior plus production deployment documentation coverage.
