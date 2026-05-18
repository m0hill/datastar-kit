# T011 — Simplify Datastar client asset helpers

## Status

`pending`

## Grill level

`2/5` — low-risk simplification.

## Why this task exists

`src/client.ts` is mostly useful, but it has route tuple helpers that feel like convenience API surface added before use has proven them.

The core need is simple: render a Datastar script tag/document and optionally serve the pinned client asset.

## Recommended answer

Keep document/script helpers and one route helper. Remove tuple-composition helpers.

## Keep candidates

- `datastarScript`
- `datastarDocument`
- `datastarPageResponse` if it aligns with canonical response naming
- `datastarClientResponse`
- either `datastarClientRoute` or `datastarClientFileRoute`, if examples need it

## Removal candidates

- `datastarClientRoutes`
- `datastarClientFileRoutes`
- excess asset configuration options without a current example

## Implementation work

- Remove tuple route helpers.
- Align page response naming with T003.
- Keep cache-control behavior minimal.
- Update dev server/examples if they import removed helpers.

## Acceptance criteria

- Client helper surface is small and obvious.
- Users can still include and serve the pinned Datastar client.
- There are no route composition helpers just for convenience.

## Anti-goals

- Do not add CDN/version/integrity configuration unless implementing it now.
- Do not create an asset pipeline.
- Do not preserve helper aliases.
