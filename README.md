# Datastar Kit workspace

This repository is organized as a pnpm workspace.

## Packages

- [`packages/datastar-kit`](packages/datastar-kit) — the publishable SDK package, including source, tests, and README.
- [`packages/website`](packages/website) — the VitePress website.
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

Run the example or docs site:

```sh
pnpm run dev:hono-counter
pnpm run dev:website
```

Package documentation starts at [`packages/datastar-kit/README.md`](packages/datastar-kit/README.md), with longer-form content in [`packages/website`](packages/website).
