# Worker Hono live todos

A Cloudflare Workers + Hono + D1 example using Datastar Kit for server-rendered UI and live Datastar SSE patches.

This example intentionally keeps responsibilities separate:

- **D1** stores durable todo state.
- **The Worker/Hono app** handles routes, validates Datastar signals with Zod, mutates D1, reads snapshots, and renders Datastar patches.
- **Cloudflare Workers Static Assets** serves `public/styles.css`.
- **The Durable Object** only owns live SSE subscribers and fans out already-rendered, versioned Datastar events.

The Durable Object is not the database in this example. The form uses `ds.state(...)`, `ds.bind(...)`, `read.signals(...)`, and Zod validation to match the other Datastar Kit examples. Writes use D1's `batch()` API for multi-statement atomic changes because D1 does not allow SQL `BEGIN`/`SAVEPOINT` transactions from Worker code.

## Run it locally

Apply the D1 migration once:

```sh
pnpm db:migrate:local
```

Start Wrangler:

```sh
pnpm dev
```

Open the local URL in two tabs. Adding, toggling, or deleting a todo in either tab updates both.

## Deploy

Create/update the D1 database configured in `wrangler.jsonc` and replace the placeholder `database_id`, then apply remote migrations:

```sh
pnpm db:migrate:remote
pnpm deploy
```

## Typegen

Regenerate Cloudflare binding types after changing `wrangler.jsonc`:

```sh
pnpm cf-typegen
```

The checked-in example uses a local `Bindings` type in `src/index.tsx`; `CloudflareBindings` is available if you prefer to use generated binding types directly.
