# Hono Linear clone

A small Linear-style issue tracker built with Hono, Datastar Kit, Drizzle ORM, SQLite, Drizzle Kit, and Zod.

The example intentionally starts with no data. Create an account in the UI, then create projects, issues, and comments from there.

## Run

```sh
pnpm --filter @datastar-kit/example-hono-linear-clone dev
```

The `dev` script runs the TSX source directly. Run migrations separately when the schema changes:

```sh
pnpm --filter @datastar-kit/example-hono-linear-clone db:migrate
```

Set `DB_FILE_NAME` to choose a different SQLite file:

```sh
DB_FILE_NAME=./linear-clone.sqlite pnpm --filter @datastar-kit/example-hono-linear-clone dev
```

## What it shows

- `ds.state(...)` for form state, validation messages, and typed signal patches.
- `read.signals(request)` plus Zod at command boundaries.
- Server-rendered TSX patches for the board, sidebar, issue composer, and issue detail panel.
- Realtime current-state rendering with an in-memory invalidation hub and `reply.stream(...)`.
- Drizzle schema in `src/db/schema.ts`, managed through Drizzle Kit.
