# Examples

The examples are tested reference slices for the Web Standards SDK direction. Each first-party example exports a fetch-compatible handler that accepts a native `Request` and returns a native `Response` or promise.

## Counter

`examples/counter.ts` keeps one low-level `h(...)` hyperscript reference. It stores `count` on the server; the click action mutates backend state and patches the self-identifying `#count` element without an explicit selector.

## TSX counter

`examples/tsx-counter.tsx` demonstrates the blessed automatic JSX runtime over the same HTML node model.

## Append list

`examples/append-list.tsx` demonstrates the explicit-selector pattern: each action renders a new `<li>` and appends it into the `#items` container with `{ selector: "#items", mode: "append" }`.

## Search

`examples/search.tsx` demonstrates Datastar action URL generation with `ds.queryUrl(...)` and server-rendered JSX result patches.

## Live counter recipe

`examples/live-counter.tsx` demonstrates app-owned invalidation subscribers adapted into an SSE stream with `reply.stream(...)`. Core does not provide a live-query runtime.

## Validation form

`examples/validation-form.tsx` uses input signals, Standard Schema-compatible Zod validation, app-local validation errors, validation signal patches, and a success patch that updates backend state.

## Hono counter

`examples/hono-counter.tsx` shows Hono as an application framework around `ts-star` helpers. `examples/hono-live-counter.tsx` uses Hono routes around the live counter SSE recipe. Hono is not imported by core.

## Todo sync

`examples/todo-sync.tsx` is a full-stack Hono Node example. It uses blessed TSX views, Tailwind browser CSS, Hono `compress()` middleware, `read.signals(...)` with Zod validation, backend-owned todo state, and `reply.stream(...)` SSE fan-out so multiple tabs receive create/toggle/delete updates in real time.
