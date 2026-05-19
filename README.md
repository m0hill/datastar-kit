# ts-star

Web Standards Datastar SDK for server-driven TypeScript applications.

`ts-star` is intentionally small. It gives you Datastar-oriented HTML, attribute, signal-reading, SSE, and response helpers that compose inside any fetch-compatible JavaScript framework. Your app framework owns routing, middleware, auth, deployment, dependencies, and lifecycle.

See [`CONTEXT.md`](CONTEXT.md) and [`docs/adr/0001-web-standards-sdk-core.md`](docs/adr/0001-web-standards-sdk-core.md) for the experimental branch direction.

## Current architecture

The package root exposes:

- `ds` — Datastar actions, attributes, signal refs, and expression escape hatches.
- `event` — rendered Datastar SSE event helpers for streams.
- `read` — Datastar signal decoding from a native `Request` with Standard Schema validation.
- `reply` — Datastar-safe native `Response` helpers.
- `h`, `render`, `fragment`, `unsafeHtml`, `props`, `page` — low-level server HTML primitives used by the JSX runtime.

Explicit subpaths:

- `ts-star/jsx-runtime` / `ts-star/jsx-dev-runtime` — automatic JSX runtime for `jsxImportSource: "ts-star"`.
- `ts-star/jsx` — classic JSX factory compatibility and the underlying JSX node adapter.
- `ts-star/sse` — low-level Datastar SSE event encoding for protocol tests and escape hatches.

There is no core router, middleware system, dependency-injection context, runtime, PubSub, or application framework adapter. Hono is shown only as an example integration.

## Minimal counter

The blessed view-authoring path is server-side JSX. Configure TypeScript once:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "ts-star"
  }
}
```

```tsx
import { ds, reply } from "ts-star"

const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

let count = 0

const Count = () => <output id="count">{count}</output>

const Counter = () => (
  <main id="counter">
    <button type="button" {...ds.on("click", ds.post("/increment"))}>+</button>
    <Count />
  </main>
)

export function handle(request: Request): Response {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") {
    return reply.page({
      head: <script type="module" src={DATASTAR_CDN} />,
      body: <Counter />
    })
  }

  if (request.method === "POST" && url.pathname === "/increment") {
    count += 1
    return reply.patch(<Count />, { selector: "#count" })
  }

  return new Response("Not Found", { status: 404 })
}
```

## Datastar expressions

Common actions and attributes stay structured through `ds.*` helpers. When a client-side expression is actually needed, use `ds.expr` so signal refs and JS literals interpolate safely instead of hand-building attribute strings:

```tsx
const count = ds.signal<number>("count")
const max = 10

<button {...ds.dataAttr("disabled", ds.expr`${count} >= ${max}`)}>+</button>
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
- `reply.stream(...)` — SSE stream from iterable, async iterable, or `ReadableStream` event sources; pair with `event.patch(...)` / `event.signals(...)` for rendered event chunks.
- `reply.done(...)` — `204` command completion with no body.
- `reply.navigate(...)` — safe direct script navigation.
- `reply.directHtml(...)`, `reply.directSignals(...)`, `reply.directScript(...)` — flat explicit Datastar direct-response escape hatches.

Datastar action helpers own their protocol status codes. Protocol options and response headers live in one flattened options object, e.g. `reply.patch(view, { selector: "#count", headers })`. Use plain `new Response(...)` for non-Datastar HTTP semantics such as ordinary `404` or API JSON errors.

## Examples

Reference examples live in `examples/`:

- `counter.ts` — low-level `h(...)` hyperscript example for the smallest backend-state element patch flow.
- `tsx-counter.tsx` — smallest backend-state element patch flow using the blessed JSX runtime.
- `search.tsx` — Datastar-driven query URL example using the blessed JSX runtime.
- `live-counter.tsx` — recipe-style app-owned SSE invalidation stream using the blessed JSX runtime.
- `validation-form.tsx` — recoverable validation patches using Standard Schema-compatible Zod and JSX views.
- `hono-counter.tsx` — Hono as an application-framework integration around `Request -> Response` helpers and JSX views.
- `hono-live-counter.tsx` — Hono routing around the app-owned live counter SSE recipe.
- `todo-sync.tsx` — full-stack Hono todo sync with blessed TSX views, Tailwind browser CSS, `read.signals(...)` + Zod validation, compression middleware, and realtime SSE fan-out.

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
- Server-rendered HTML should stay simple; external renderer output should cross the trust boundary explicitly with `unsafeHtml(renderedHtml)`.
- `ts-star` should not become a virtual DOM runtime, client router, React-style lifecycle system, complex browser store, plugin-heavy framework clone, or application runtime.
