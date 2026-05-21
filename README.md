# datastar-kit

Datastar Kit is an independent TypeScript companion SDK for building server-driven Datastar UI with Web Standard `Request` and `Response` primitives. It gives you typed helpers for Datastar attributes, actions, signals, SSE events, and server-rendered HTML while your application framework owns routing, middleware, auth, deployment, and lifecycle.

## Features

- **Datastar-first helpers** — `ds` mirrors Datastar actions, attributes, signals, expressions, and modifiers.
- **Server-side JSX** — Use `jsxImportSource: "datastar-kit"` for small server-rendered view functions.
- **Native responses** — `reply` returns standard `Response` objects for pages, patches, signals, streams, direct responses, and command completion.
- **SSE by default** — Normal Datastar updates use `text/event-stream`; direct responses stay available as explicit escape hatches.
- **Optional schema validation** — Read parsed JSON object signal state directly, or validate it with any Standard Schema-compatible validator.
- **Web standards only** — No router, middleware runtime, dependency injection container, client store, or framework adapter in core.

## Installation

```sh
npm i datastar-kit
```

Datastar Kit does not bundle the Datastar browser runtime. Include Datastar in your page explicitly, either from a pinned CDN URL or by serving your own copy of `@starfederation/datastar`.

```tsx
const DATASTAR_CDN = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"
```

For JSX, configure TypeScript once:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "datastar-kit"
  }
}
```

## Usage

A Datastar Kit handler is just a function that accepts a native `Request` and returns a native `Response`.

```tsx
import { ds, reply } from "datastar-kit"

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
    return reply.page(<Counter />, {
      head: <script type="module" src={DATASTAR_CDN} />
    })
  }

  if (request.method === "POST" && url.pathname === "/increment") {
    count += 1
    return reply.patch(<Count />)
  }

  return new Response("Not Found", { status: 404 })
}
```

## Datastar helpers

Import the Datastar helper namespace as `ds`:

```tsx
import { ds } from "datastar-kit"

const title = ds.signal<string>("title")

<form
  {...ds.dataSignals({ title: "" }, { ifMissing: true })}
  {...ds.on("submit", ds.post("/todos", { payload: { title } }), { prevent: true })}
>
  <input {...ds.bind(title)} />
  <button type="submit">Add</button>
</form>
```

Use `ds.expr` when you need a client-side expression. Template interpolation serializes signal refs and JavaScript literals safely:

```tsx
const count = ds.signal<number>("count")

<button {...ds.dataAttr("disabled", ds.expr`${count} >= ${10}`)}>+</button>
```

## Reading signals

Schema validation is optional. Without a schema, `read.signals(request)` returns parsed JSON object signal state:

```ts
import { read } from "datastar-kit"

const signals = await read.signals(request)
```

For user input, prefer validating at the request boundary with any Standard Schema-compatible validator:

```ts
import { z } from "zod"
import { read, reply } from "datastar-kit"

const CounterSignals = z.object({ count: z.number() })

export async function increment(request: Request): Promise<Response> {
  const { count } = await read.signals(request, CounterSignals)
  return reply.signals({ count: count + 1 })
}
```

`read.signals` hides Datastar's transport details: `GET` and `DELETE` read the `datastar` query parameter, while mutating methods read the request body as JSON.

## Responses

`reply` helpers return native `Response` objects. Datastar action helpers own their protocol status codes, so protocol options and native response options are separate:

```tsx
reply.patch(<Count />, { selector: "#count" }, { headers: { "x-action": "increment" } })
reply.signals({ saving: false }, { onlyIfMissing: true }, { headers: { "x-action": "save" } })
```

Use:

- `reply.page(body, options, init)` for a full HTML document response. `init` is normal `ResponseInit`, including status.
- `reply.patch(view, options, init)` for an SSE element patch response.
- `reply.signals(state, options, init)` for an SSE signal patch response.
- `reply.stream(events, options, init)` for multiple or long-lived SSE event chunks.
- `reply.done(init)` for a `204` command completion with no body.
- `reply.navigate(url, options, init)` for safe Datastar-driven navigation.

For normal component updates, omit `selector` and render stable IDs on the top-level elements you return. Pass `selector` when targeting a container or CSS match, such as appending to a list or removing elements.

```tsx
reply.patch(<Count />)
reply.patch(<TodoItem todo={todo} />, { selector: "#todos", mergeMode: "append" })
```

## Streaming events

Use `event.*` helpers to build explicit SSE chunks for `reply.stream`:

```tsx
import { event, reply } from "datastar-kit"

async function* events() {
  yield event.patchElements(<output id="count">0</output>)
  yield event.patchSignals({ ready: true })
}

return reply.stream(events(), {
  heartbeat: { intervalMs: 15_000, comment: "count" }
})
```

For protocol tests or custom encoders, `datastar-kit/sse` exposes low-level string builders: `patchElements`, `patchSignals`, and `executeScript`.

## Direct response escape hatches

Datastar Kit strongly recommends SSE helpers as the default path. Direct responses remain public for integrations that specifically need Datastar's direct-response handling:

- `reply.directHtml(html, options, init)`
- `reply.directSignals(state, options, init)`
- `reply.directScript(script, options, init)`

Security warning: only pass trusted or sanitized HTML to `unsafeHtml` / `directHtml`, and only pass trusted script text to `directScript`. Prefer `reply.navigate` for navigation and structured patches for ordinary UI updates.

## Low-level HTML

JSX is the primary authoring path. Low-level helpers are available for tests, code generation, and non-JSX environments:

```ts
import { ds, h, mergeProps, renderToString } from "datastar-kit"

const view = h("button", mergeProps({ type: "button" }, ds.on("click", ds.post("/save"))), "Save")
const html = renderToString(view)
```

## Examples

Reference examples live in `examples/`:

- `counter.ts` — low-level `h(...)` counter.
- `tsx-counter.tsx` — JSX counter.
- `append-list.tsx` — selector-based append patch.
- `search.tsx` — reactive query URL search.
- `live-counter.tsx` — app-owned SSE invalidation recipe.
- `validation-form.tsx` — optional Standard Schema validation with recoverable UI patches.
- `hono-counter.tsx` / `hono-live-counter.tsx` — Hono integration examples.
- `todo-sync.tsx` — fuller Hono todo sync with realtime fan-out.

## Checking examples

Use focused package scripts when changing examples:

```sh
pnpm run check:examples
pnpm run check:example:counter
pnpm run check:example:tsx-counter
pnpm run check:example:append-list
pnpm run check:example:search
pnpm run check:example:live-counter
pnpm run check:example:validation-form
pnpm run check:example:todo-sync
pnpm run check:example:hono-counter
pnpm run check:example:hono-live-counter
```

The `check:*` scripts run `typecheck` first, then the matching example test. Use `test:examples` or `test:example:*` when you only need Vitest.

## Running example dev servers

Each dev script builds the TypeScript examples, then starts one example through a local Node server:

```sh
pnpm run dev:counter
pnpm run dev:tsx-counter
pnpm run dev:append-list
pnpm run dev:search
pnpm run dev:live-counter
pnpm run dev:validation-form
pnpm run dev:todo-sync
pnpm run dev:hono-counter
pnpm run dev:hono-live-counter
```

The default address is `http://127.0.0.1:3000`. Override it with `PORT=4000` or `HOST=0.0.0.0`.

## Related Work

- [Datastar](https://data-star.dev/) — the browser runtime and hypermedia protocol this SDK targets.
- [Datastar SDK reference](https://data-star.dev/reference/sdks) — official SDK overview across languages.
- [Standard Schema](https://standardschema.dev/) — validator-agnostic schema interface used by optional signal validation.

## License

MIT
