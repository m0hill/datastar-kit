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
