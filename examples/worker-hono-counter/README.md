# Worker Hono Counter

A minimal Cloudflare Workers + Hono counter using Datastar Kit and a Durable Object.

Hono routes native `Request` objects, the Durable Object owns the counter state and live subscribers, and Datastar Kit returns native `Response` objects for the full page, action patch, and realtime stream.

```sh
pnpm install
pnpm dev
```

```sh
pnpm deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```sh
pnpm cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiating `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```
