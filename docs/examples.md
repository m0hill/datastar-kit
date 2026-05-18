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

The search example uses a query schema, a debounced Datastar `GET`, URL query behavior, direct HTML replacement of `#results`, filtered rows, and an empty state.

Run:

```sh
pnpm run dev:search
pnpm run check:example:search
```

## Form with validation

Files: `examples/validation-form.ts`, `test/validation-form-example.test.ts`.

The form uses input signals, Effect Schema decode, typed `FormValidationError`, validation signal patches, server-rendered error summaries, and a success patch that updates backend state.

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

Use `src/security.ts` with app-specific services:

1. Read the current user/session in your platform adapter.
2. Provide `Security.AuthContext` or your richer app-specific auth service.
3. Require write actions to pass `requireCsrfToken`.
4. Decode browser signals as untrusted input and keep backend state authoritative.
5. Use `safeRedirectResponse` / `safeNavigatePatch` for navigation targets.

`ts-star` does not own your auth/session store; it provides hooks where write actions cross the trust boundary.

## Browser integration

`test/datastar-browser-runtime.test.ts` runs a real browser with the pinned Datastar asset. It includes protocol fixtures and the backend-state counter reference example. Add browser tests when a behavior depends on the Datastar runtime, not just string encoding.
