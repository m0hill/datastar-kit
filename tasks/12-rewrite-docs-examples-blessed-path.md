# T012 — Rewrite docs and examples around one blessed path

## Status

`pending`

## Grill level

`3/5` — design cleanup with a recommended answer.

## Why this task exists

The docs and examples currently reflect multiple prototype eras: direct responses, runtime services, contracts with route helpers, validation modules, observability modules, and public API stabilization language.

Docs should teach the framework identity, not catalog every helper that happened to be implemented.

## Recommended answer

Show one path:

1. render server HTML;
2. attach Datastar attributes;
3. decode signals/query with Effect Schema at the boundary;
4. mutate/read backend state;
5. return `204` or SSE patch;
6. use live queries for current-state realtime.

## Implementation work

- Rewrite README minimal counter after API cleanup.
- Update or delete examples that demonstrate removed APIs.
- Keep examples small: counter, search, live query, maybe validation recipe.
- Remove docs that advertise modules moved out of public core.
- Remove pre-release deprecation/compatibility policy.
- Replace "stable candidates" language with "current blessed path" language.
- Ensure all docs use namespace imports or whatever T002 chooses.

## Docs to review

- `README.md`
- `docs/architecture.md`
- `docs/public-api.md`
- `docs/api-reference.md`
- `docs/runtime.md`
- `docs/type-contracts.md`
- `docs/security.md`
- `docs/errors-validation.md`
- `docs/observability-testing.md`
- `docs/live-queries.md`

## Acceptance criteria

- New users see fewer concepts, not more.
- Docs no longer preserve old/new approaches side-by-side.
- Removed APIs are not referenced.
- Examples compile and represent the intended philosophy.

## Anti-goals

- Do not write completeness docs for modules that were intentionally removed.
- Do not add migration notes before users exist.
- Do not present recipes as public core APIs.
