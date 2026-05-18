# ts-star framework tasks

This directory tracks the remaining architecture and implementation work needed to turn `ts-star` from a Datastar + Effect prototype into a coherent framework.

- `tasks.json` is the machine-readable tracker and implementation order.
- `01-*.md` through `14-*.md` are the task briefs.

Status values used by `tasks.json`:

- `pending` — not started
- `running` — actively being worked on
- `blocked` — waiting on a decision or prerequisite
- `done` — completed and validated
- `deferred` — intentionally postponed

Recommended rule: only mark a task `done` when its acceptance criteria are met and examples/tests/docs reflect the intended framework model.
