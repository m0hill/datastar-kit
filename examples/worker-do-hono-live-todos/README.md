# Worker DO Hono live todos

A Cloudflare Workers + Hono todo app using Datastar Kit for server-rendered UI and a Durable Object for both SQLite persistence and live fan-out.

## Architecture

Use this mental model for Cloudflare apps that keep a small collaborative dataset inside one Durable Object:

- **The Worker** owns HTTP routes, validation, and rendering Datastar patches.
- **A named Durable Object** owns the SQLite table, mutation methods, active SSE subscribers, and fan-out.
- **Datastar** applies the immediate action patch and live stream patches in the browser.

The Worker does not talk to SQLite directly. It receives HTTP requests, gets the named Durable Object stub, calls RPC methods like `getTodos()` and `createTodo()`, renders the returned todos, and sends the HTTP response back to the browser.

## Durable Object pattern

Use one Durable Object class for many named todo rooms. The name is the persistence and realtime boundary: everyone connected to the same name sees the same SQLite rows and the same rendered patches.

```ts
const id = env.TODO_ROOMS.idFromName(`workspace:${workspaceId}:todos`)
const room = env.TODO_ROOMS.get(id)
```

This example has one shared room:

```ts
const TODOS_ROOM = "todos"
const room = env.TODO_ROOMS.get(env.TODO_ROOMS.idFromName(TODOS_ROOM))
```

Choose room names by data and security boundaries. Everyone who can call or subscribe to a room can receive that room's rendered todo list.

## Request flow

On page load:

1. `GET /` calls `room.getTodos()` and returns the HTML page.
2. `ds.init(ds.get("/live"))` opens a Datastar SSE stream.
3. `GET /live` calls `room.getTodos()` for the initial patch, then subscribes the tab to the same Durable Object.

On mutation:

1. The Worker validates Datastar signals.
2. The Worker calls a Durable Object RPC method such as `room.createTodo(title)`.
3. The Durable Object writes SQLite through `this.ctx.storage.sql` and returns the latest todo snapshot.
4. The Worker renders a Datastar patch and returns it immediately to the tab that made the request.
5. The Worker also queues `room.publish(patch)` with `ctx.waitUntil(...)`.
6. The Durable Object fans out the same rendered patch to every connected tab.

## SQLite in the Durable Object

The Durable Object uses SQLite-backed storage, enabled by the `new_sqlite_classes` migration in `wrangler.jsonc`:

```jsonc
"migrations": [
  {
    "tag": "v1",
    "new_sqlite_classes": ["TodoRoom"]
  }
]
```

`TodoRoom` creates its table with `CREATE TABLE IF NOT EXISTS` in the constructor and reads/writes rows with `this.ctx.storage.sql.exec(...)`.

## Run locally

Start Wrangler:

```sh
pnpm --dir examples/worker-do-hono-live-todos dev
```

Open the Wrangler local URL in two tabs. Adding, toggling, or deleting a todo in either tab updates both.

## Deploy

Deploy the Worker. The Durable Object class migration in `wrangler.jsonc` creates the SQLite-backed Durable Object class; there is no D1 database to create or migrate.

```sh
pnpm --dir examples/worker-do-hono-live-todos deploy
```

## Typegen

This example uses Wrangler-generated `CloudflareBindings` types. Regenerate them after changing `wrangler.jsonc`:

```sh
pnpm --dir examples/worker-do-hono-live-todos cf-typegen
```
