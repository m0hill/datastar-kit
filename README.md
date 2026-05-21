# Datastar Kit workspace

This repository is organized as a pnpm workspace.

## Packages

- [`packages/datastar-kit`](packages/datastar-kit) — the publishable SDK package, including source, tests, README, and docs.
- [`examples/hono-counter`](examples/hono-counter) — a standalone Hono counter example that consumes `datastar-kit` through a workspace dependency.

Additional standalone examples can be added as new packages under `examples/*`.

## Common commands

```sh
pnpm install
pnpm run build
pnpm run typecheck
pnpm test
pnpm run check
```

Run the example:

```sh
pnpm run dev:hono-counter
```

Package documentation starts at [`packages/datastar-kit/README.md`](packages/datastar-kit/README.md), with longer-form docs at [`packages/datastar-kit/docs/README.md`](packages/datastar-kit/docs/README.md).
