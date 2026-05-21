# Examples

Examples are standalone workspace packages under `examples/*`. Each one should be copyable, own its runtime dependencies, and show one integration or recipe clearly.

Run commands from the repository root. Each dev script serves its app at `http://localhost:3000` or `http://127.0.0.1:3000`.

| Example | Shows | Run |
| --- | --- | --- |
| `examples/hono-counter` | Minimal Hono routes, TSX views, backend-owned count state, and a focused `reply.patch(...)`. | `pnpm run dev:hono-counter` |
| `examples/hono-modal` | A server-rendered native `<dialog>` controlled by Datastar signals and a small `data-effect` bridge. | `pnpm run dev:hono-modal` |
| `examples/hono-form-validation` | `data-bind` inputs, `@post(...)`, `read.signals(request, schema)` with Zod/Standard Schema, and validation signal patches. | `pnpm run dev:hono-form-validation` |
| `examples/elysia-layout` | Bun/Elysia structure with a shared shell, named layout slots, route-level data loading, and a targeted `#project-list` patch. | `pnpm run dev:elysia-layout` |
| `examples/deno-search-list` | `Deno.serve(...)`, `@std/http` routing, Tailwind CSS, search patches, and `mode: 'append'` list additions. | `pnpm run dev:deno-search-list` |

## Adding examples

When adding a new example:

- make it a standalone workspace package under `examples/*`;
- keep runtime dependencies in that example's `package.json`, `deno.json`, or equivalent runtime config;
- document what the example demonstrates in its own README;
- add root scripts for `dev:*` and checks when useful;
- link it from this page and the package README.

Related: [HTML and JSX](html-and-jsx.md), [Actions and responses](actions-and-responses.md), [Testing](testing.md).
