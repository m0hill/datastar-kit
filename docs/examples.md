# Examples

The examples are tested reference slices for the Web Standards SDK direction. Each first-party example exports a fetch-compatible handler that accepts a native `Request` and returns a native `Response` or promise.

## Counter

`examples/counter.ts` stores `count` on the server. The click action mutates backend state and patches the rendered `#count` element. Stale browser signal payloads are ignored because backend state is authoritative.

## TSX counter

`examples/tsx-counter.tsx` demonstrates the explicit server-only JSX adapter over the same HTML node model.

## Search

`examples/search.ts` demonstrates Datastar action URL generation with `ds.queryUrl(...)` and server-rendered result patches.

## Live counter recipe

`examples/live-counter.ts` demonstrates app-owned invalidation subscribers adapted into an SSE stream with `reply.stream(...)`. Core does not provide a live-query runtime.

## Validation form

`examples/validation-form.ts` uses input signals, Standard Schema-compatible Zod validation, app-local validation errors, validation signal patches, and a success patch that updates backend state.

## Hono counter

`examples/hono-counter.ts` shows Hono as an application framework around `ts-star` helpers. Hono is not imported by core.
