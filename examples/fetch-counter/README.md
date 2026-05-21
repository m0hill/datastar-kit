# Fetch counter

A minimal Datastar Kit counter written as a plain Fetch-style handler:

```ts
(request: Request) => Response | Promise<Response>
```

The example uses TSX views and `reply.*` response helpers. The small Node `http` adapter at the bottom of `src/index.tsx` is only there so the example can run locally; the application handler itself stays framework-free.

## What it demonstrates

- server-rendered TSX with `jsxImportSource: "datastar-kit"`;
- Datastar action attributes through `ds.on(...)` and `ds.post(...)`;
- a backend-owned `count` value;
- `reply.page(...)` for the initial document;
- `reply.patch(...)` for a focused element update.

## Run it

From the repository root:

```sh
pnpm run dev:fetch-counter
```

Or from this directory:

```sh
pnpm install
pnpm run dev
```

Open <http://127.0.0.1:3000>.

Set `HOST` or `PORT` to change the local address:

```sh
PORT=4000 pnpm run dev
```
