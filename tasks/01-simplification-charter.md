# T001 — Write the simplification charter and smallest blessed core

## Status

`pending`

## Grill level

`3/5` — design cleanup with a recommended answer.

## Why this task exists

The previous roadmap pushed `ts-star` toward completeness: runtime services, validation, security, observability, extension points, deployment, compatibility language. The audit found a smaller and clearer framework inside the current codebase.

Before deleting APIs, the repo should state the new rule: complexity must be earned.

## Recommended answer

`ts-star` is an Effect-native, server-driven Datastar framework:

- backend state is the source of truth;
- server renders HTML;
- Datastar sends browser intent and applies patches;
- SSE is the default realtime/patch path;
- Effect is used where it improves lifecycle, typed errors, dependencies, resources, or streams.

It is not a React/Vue/Solid replacement, frontend store, client router, generic auth/security framework, or plugin platform.

## Smallest blessed core

1. Datastar SSE protocol helpers.
2. Simple server HTML rendering boundary.
3. Thin Datastar attribute/action helpers.
4. Effect Platform signal/query decoding and canonical responses.
5. Current-state live query helper.
6. Narrow schema-derived signal typing.

## Implementation work

- Rewrite relevant README/docs language from growth roadmap to simplification charter.
- Name foundational abstractions vs accidental ones.
- Remove pre-release compatibility/deprecation promises.
- State that old/new approaches should not coexist before users exist.
- Define the cleanup rule: one blessed path beats multiple equivalent APIs.

## Acceptance criteria

- Docs identify the smallest conceptual core.
- Docs say what the framework must not become.
- Docs no longer imply every current module deserves public API status.
- Future cleanup tasks can cite this charter when deleting APIs.

## Anti-goals

- Do not add new framework features.
- Do not write a broad enterprise architecture document.
- Do not preserve APIs for hypothetical migration users.
