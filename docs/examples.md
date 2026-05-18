# Reference examples

The examples are intentionally small, but each one teaches a framework concept without making browser signals the durable state store.

## Backend-state counter

Files: `examples/counter.ts`, `examples/runtime-counter.ts`, `test/example-counter.test.ts`, `test/runtime-counter-example.test.ts`.

The counter stores `count` on the server. The click action mutates backend state and patches the rendered `#count` element. The runtime variant shows the same model with Effect services/layers and a schema-derived signal contract for request inputs.

Run:

```sh
pnpm run dev:counter
pnpm run dev:runtime-counter
pnpm run check:example:counter
pnpm run check:example:runtime-counter
```

## Search/filter page

Files: `examples/search.ts`, `test/search-example.test.ts`.

The search example uses a query schema, a debounced Datastar `GET`, URL query behavior, an SSE element patch for `#results`, filtered rows, and an empty state.

Run:

```sh
pnpm run dev:search
pnpm run check:example:search
```

## Form with validation

Files: `examples/validation-form.ts`, `test/validation-form-example.test.ts`.

The form uses input signals, Effect Schema decode, app-local validation errors, validation signal patches, and a success patch that updates backend state.

Run:

```sh
pnpm run dev:validation-form
pnpm run check:example:validation-form
```

## Live query counter

Files: `examples/live-counter.ts`, `test/live-counter-example.test.ts`.

The live counter uses command routes to mutate backend state, a live query to render current state on connect and invalidation, heartbeats for idle streams, scoped resources for shutdown, and reconnect-safe current-view rendering.

Run:

```sh
pnpm run dev:live-counter
pnpm run check:example:live-counter
```

## Security/session sketch

Security policy belongs to the app:

1. Read the current user/session in your platform adapter or app services.
2. Run permission and CSRF checks at the router/command boundary.
3. Decode browser signals as untrusted input and keep backend state authoritative.
4. Use `reply.navigate(...)` for Datastar-driven navigation targets instead of hand-written scripts.

`ts-star` does not own your auth/session store or request-policy middleware.

## Browser integration

`test/datastar-browser-runtime.test.ts` runs a real browser with the pinned Datastar asset. It includes protocol fixtures and the backend-state counter reference example. Add browser tests when a behavior depends on the Datastar runtime, not just string encoding.
