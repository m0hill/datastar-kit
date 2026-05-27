# Examples

Examples are standalone workspace packages under `examples/*`. Each one owns its runtime dependencies and demonstrates one integration or application shape.

Run commands from the repository root. Node, Bun, and Deno examples usually serve at `http://localhost:3000` or `http://127.0.0.1:3000`. Worker examples print Wrangler's local URL.

## Recommended order

| Start here                      | Why                                                                       |
| ------------------------------- | ------------------------------------------------------------------------- |
| `examples/hono-counter`         | Smallest complete request, page, action, and patch loop.                  |
| `examples/hono-form-validation` | Signals, `read.signals(...)`, schema validation, and validation feedback. |
| `examples/hono-live-counter`    | The live-view model with an in-memory invalidation hub.                   |
| `examples/elysia-layout`        | Layouts, route-level data loading, named slots, and targeted patches.     |

## Example catalog

| Example                              | Shows                                                                                      | Run                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `examples/hono-counter`              | Minimal Hono routes, TSX views, backend-owned count state, and `reply.patch(...)`.         | `pnpm run dev:hono-counter`              |
| `examples/hono-live-counter`         | Count state synced across tabs with SSE and an in-memory invalidation hub.                 | `pnpm run dev:hono-live-counter`         |
| `examples/hono-live-counter-redis`   | Redis pub/sub as a cross-process invalidation bus for live streams.                        | `pnpm run dev:hono-live-counter-redis`   |
| `examples/hono-modal`                | Native `<dialog>` controlled by Datastar signals and a small browser bridge.               | `pnpm run dev:hono-modal`                |
| `examples/hono-form-validation`      | Bound inputs, Datastar signal decoding, Zod validation, and signal patches.                | `pnpm run dev:hono-form-validation`      |
| `examples/hono-custom-actions`       | Custom Datastar actions/plugins instead of long inline expressions.                        | `pnpm run dev:hono-custom-actions`       |
| `examples/hono-linear-clone`         | Authenticated Linear-style issue tracking with live views and signal-backed forms.         | `pnpm run dev:hono-linear-clone`         |
| `examples/worker-hono-counter`       | Minimal Cloudflare Workers and Hono routes with page and patch responses.                  | `pnpm run dev:worker-hono-counter`       |
| `examples/worker-hono-live-todos`    | Workers, Hono, D1 todos, and a Durable Object fan-out hub for live streams.                | `pnpm run dev:worker-hono-live-todos`    |
| `examples/worker-do-hono-live-todos` | Durable Object-owned SQLite persistence and live fan-out.                                  | `pnpm run dev:worker-do-hono-live-todos` |
| `examples/elysia-layout`             | Bun/Elysia app structure, shared shell, named slots, and targeted `#project-list` patches. | `pnpm run dev:elysia-layout`             |
| `examples/deno-search-list`          | `Deno.serve(...)`, `@std/http` routing, search patches, and appended list items.           | `pnpm run dev:deno-search-list`          |

## Adding examples

When adding a new example:

- make it a standalone workspace package under `examples/*`;
- keep runtime dependencies in that example's package or runtime config;
- document what the example demonstrates in its own README;
- add root scripts for `dev:*` and checks when useful;
- link it from this catalog and the package README.

Related: [Actions and responses](actions-and-responses.md), [Realtime](realtime.md), [Testing](testing.md).
