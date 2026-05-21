# Datastar Kit workspace

This repository is organized as a pnpm workspace.

## Packages

- [`packages/datastar-kit`](packages/datastar-kit) — the publishable SDK package, including source, tests, README, and docs.
- [`examples/showcase`](examples/showcase) — runnable examples that consume `datastar-kit` through a workspace dependency.

Additional examples can be added as new packages under `examples/*`.

## Common commands

```sh
pnpm install
pnpm run build
pnpm run typecheck
pnpm test
pnpm run check
```

Run examples through root forwarding scripts:

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

Package documentation starts at [`packages/datastar-kit/README.md`](packages/datastar-kit/README.md).
