# ts-star

Web Standards Datastar SDK for server-driven TypeScript applications.

`ts-star` is intentionally small. It gives you Datastar-oriented HTML, attribute, signal-reading, SSE, and response helpers that compose inside any fetch-compatible JavaScript framework. Your app framework owns routing, middleware, auth, deployment, dependencies, and lifecycle.

See [`CONTEXT.md`](CONTEXT.md) and [`docs/adr/0001-web-standards-sdk-core.md`](docs/adr/0001-web-standards-sdk-core.md) for the experimental branch direction.

## Current architecture

The package root exposes:

- `ds` — Datastar actions, attributes, signal refs, and expression escape hatches.
- `read` — Datastar signal decoding from a native `Request` with Standard Schema validation.
- `reply` — Datastar-safe native `Response` helpers.
- `h`, `render`, `fragment`, `raw`, `props`, `page` — tiny server HTML helpers.

Explicit subpaths:

- `ts-star/sse` — low-level Datastar SSE event encoding.
- `ts-star/jsx` — optional server-only JSX adapter over the same HTML node model.

There is no core router, middleware system, dependency-injection context, runtime, PubSub, or application framework adapter. Hono is shown only as an example integration.

## Minimal counter

```ts
import { ds, h, props, reply } from "ts-star"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

let count = 0

const countNode = () => h("output", { id: "count" }, count)

const counterNode = () =>
  h(
    "main",
    { id: "counter" },
    h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
    countNode()
  )

export function handle(request: Request): Response {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") {
    return reply.page({
      head: h("script", { type: "module", src: DATASTAR_CDN }),
      body: counterNode()
    })
  }

  if (request.method === "POST" && url.pathname === "/increment") {
    count += 1
    return reply.patch(countNode(), { selector: "#count" })
  }

  return new Response("Not Found", { status: 404 })
}
```

## Reading Datastar signals

`read.signals(request, schema)` hides Datastar's transport detail: `GET`/`DELETE` read the `datastar` query parameter, while mutating methods read the request body as JSON. The schema can come from any Standard Schema-compatible validator.

```ts
import { z } from "zod"
import { read, reply } from "ts-star"

const CounterSignals = z.object({ count: z.number() })

export async function increment(request: Request): Promise<Response> {
  const { count } = await read.signals(request, CounterSignals)
  return reply.signals({ count: count + 1 })
}
```

Core depends only on `@standard-schema/spec` for public types. Zod, Valibot, ArkType, Effect Schema, or any compatible validator can be supplied by the application.

## Responses

`reply` helpers return native `Response` objects:

- `reply.page(...)` — full HTML page/document response with normal HTTP status options.
- `reply.patch(...)` — SSE element patch response.
- `reply.signals(...)` — SSE signal patch response.
- `reply.stream(...)` — SSE stream from iterable, async iterable, or `ReadableStream` event sources.
- `reply.done(...)` — `204` command completion with no body.
- `reply.navigate(...)` — safe direct script navigation.
- `reply.directHtml(...)`, `reply.directSignals(...)`, `reply.directScript(...)` — flat explicit Datastar direct-response escape hatches.

Datastar action helpers own their protocol status codes. Use plain `new Response(...)` for non-Datastar HTTP semantics such as ordinary `404` or API JSON errors.

## Examples

Reference examples live in `examples/`:

- `counter.ts` — smallest backend-state element patch flow.
- `tsx-counter.tsx` — same model using the explicit JSX adapter.
- `search.ts` — Datastar-driven query URL example.
- `live-counter.ts` — recipe-style app-owned SSE invalidation stream.
- `validation-form.ts` — recoverable validation patches using Standard Schema-compatible Zod.
- `hono-counter.ts` — Hono as an application-framework integration around `Request -> Response` helpers.
- `hono-live-counter.ts` — Hono routing around the app-owned live counter SSE recipe.
- `todo-sync.tsx` — full-stack Hono todo sync with TSX views, Tailwind browser CSS, `read.signals(...)` + Zod validation, compression middleware, and realtime SSE fan-out.

## Checking examples

Use focused package scripts when changing examples:

```sh
pnpm run check:examples
pnpm run check:example:counter
pnpm run check:example:tsx-counter
pnpm run check:example:search
pnpm run check:example:live-counter
pnpm run check:example:validation-form
pnpm run check:example:todo-sync
pnpm run check:example:hono-counter
pnpm run check:example:hono-live-counter
```

The `check:*` scripts run `typecheck` first, then the matching example test. Use `test:examples` or `test:example:*` when you only need Vitest.

## Running example dev servers

Each dev script builds the TypeScript examples, then starts one example through a local Node server. Most examples use the shared Web `Request`/`Response` dev adapter; `todo-sync.tsx` uses Hono's Node adapter directly. Examples include the versioned Datastar CDN script explicitly in their page head:

```sh
pnpm run dev:counter
pnpm run dev:tsx-counter
pnpm run dev:search
pnpm run dev:live-counter
pnpm run dev:validation-form
pnpm run dev:todo-sync
pnpm run dev:hono-counter
pnpm run dev:hono-live-counter
```

The default address is `http://127.0.0.1:3000`. Override it with `PORT=4000` or `HOST=0.0.0.0`.

## Design constraints

- Backend state should be the durable source of truth.
- Datastar signals should stay sparse and mostly ephemeral.
- Server-rendered HTML should stay simple; external renderer output should cross the trust boundary explicitly with `raw(renderedHtml)`.
- `ts-star` should not become a virtual DOM runtime, client router, React-style lifecycle system, complex browser store, plugin-heavy framework clone, or application runtime.
