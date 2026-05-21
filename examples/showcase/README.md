# Datastar Kit examples

This workspace package contains runnable examples for the `datastar-kit` SDK.

## Run an example

From the repository root:

```sh
pnpm run dev:counter
pnpm run dev:tsx-counter
pnpm run dev:append-list
pnpm run dev:search
pnpm run dev:live-counter
pnpm run dev:validation-form
pnpm run dev:todo-sync
pnpm run dev:hono-counter
pnpm run dev:hono-live-counter
```

Or from this package:

```sh
pnpm run dev:counter
```

The default address is `http://127.0.0.1:3000`. Override with `PORT=4000` or `HOST=0.0.0.0`.

## Adding examples

Add small examples as new files in `src/` and register them in `src/dev-server.ts`. If an example needs a substantially different runtime or dependency stack, create a new workspace package under `examples/*` instead.
