# Examples

Examples are standalone workspace packages under `examples/*`. Each example should be copyable, own its runtime dependencies, and explain the integration or recipe it demonstrates.

## Hono counter

`examples/hono-counter` is the minimal workspace example. It uses TSX views, Hono routes, `ds` action helpers, and `reply.*` response helpers. It keeps `count` as backend-owned state and returns `reply.patch(...)` for the focused Datastar update.

Run it from the repository root with:

```sh
pnpm run dev:hono-counter
```

Open `http://127.0.0.1:3000`.

## Elysia layout

`examples/elysia-layout` is a Bun/Elysia app focused on normal application structure: a shared shell, named layout slots (`sidebar`, `toolbar`, `children`), route-level data loading, and a Datastar form action that patches only the `#project-list` region.

Run it from the repository root with:

```sh
pnpm run dev:elysia-layout
```

Open `http://localhost:3000`.

## Adding examples

When adding a new example:

- make it a standalone workspace package under `examples/*`;
- keep dependencies in that example's `package.json`;
- document what the example demonstrates in its own README;
- add root scripts for `dev:*` and checks when useful;
- link it from this page and the package README.

Related: [HTML and JSX](html-and-jsx.md), [Actions and responses](actions-and-responses.md), [Testing](testing.md).
