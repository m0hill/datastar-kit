# ts-star simplification tasks

This directory replaces the earlier growth-oriented roadmap with a cleanup roadmap based on the framework philosophy and complexity audit.

The goal is not to make `ts-star` more complete. The goal is to make it smaller, clearer, and harder to accidentally turn into a React-like or enterprise-style framework.

## Tracker

- `tasks.json` is the machine-readable implementation order.
- `01-*.md` through `13-*.md` are task briefs.

## Status values

- `pending` — not started
- `running` — actively being worked on
- `blocked` — waiting on a decision
- `done` — completed and validated
- `deferred` — intentionally postponed

## Grill level

Each task has a `grill_level` from 1 to 5:

1. Mechanical cleanup; implement directly.
2. Low-risk simplification; validate with tests/docs.
3. Design cleanup with a recommended answer; brief review is useful.
4. Major public-shape decision; challenge the direction before implementation.
5. Identity-defining decision; ask before committing if the direction is not already explicit.

## Cleanup rule

Because the framework has no users yet, prefer one blessed path over compatibility layers, aliases, or parallel APIs. Do not preserve an API only because it exists today.
