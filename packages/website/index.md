# Getting Started

Datastar Kit is an independent TypeScript companion SDK for building server-driven Datastar UI with Web Standard `Request` and `Response` primitives. It gives you typed helpers for Datastar attributes, actions, signals, SSE events, and server-rendered HTML in any fetch-compatible server or router.

## Features

- **Datastar-first helpers** — `ds` mirrors Datastar actions, attributes, signals, expressions, and modifiers.
- **Server-side JSX** — Use `jsxImportSource: "datastar-kit"` for small server-rendered view functions.
- **Native responses** — `reply` returns standard `Response` objects for pages, patches, signals, streams, direct responses, and command completion.
- **SSE by default** — Normal Datastar updates use `text/event-stream`; direct responses stay available as explicit escape hatches.
- **Optional schema validation** — Read parsed JSON object signal state directly, or validate it with any Standard Schema-compatible validator.
- **Framework-friendly** — Compose the helpers inside Hono, Workers, Bun, Deno, Node, or any fetch-compatible HTTP layer.

## Installation

```sh
npm i datastar-kit
```

Add the Datastar browser runtime to your page from a pinned CDN URL or by serving your own copy of `@starfederation/datastar`.

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

let count = 0

export function handle(request: Request): Response {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") {
    return reply.page(
      <main id="counter">
        <h1>Fetch counter</h1>
        <button type="button" {...ds.on("click", ds.post("/increment"))}>Increment</button>{" "}
        <output id="count">{count}</output>
      </main>,
      {
        title: "Fetch counter",
        head: <script type="module" src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js" />
      }
    )
  }

  if (request.method === "POST" && url.pathname === "/increment") {
    count += 1
    return reply.patch(<output id="count">{count}</output>)
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

Use selectors when a patch targets a container or CSS match, such as appending to a list or removing elements. See [Actions and responses](guides/actions-and-responses.md) for patch-target rules.

```tsx
reply.patch(<Count />)
reply.patch(<TodoItem todo={todo} />, { selector: "#todos", mode: "append" })
```

## Streaming events

Use `event.*` helpers to build explicit SSE chunks for `reply.stream`:

```tsx
import { event, reply } from "datastar-kit"

async function* events() {
  yield event.patch(<output id="count">0</output>)
  yield event.signals({ ready: true })
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

Standalone examples live under `examples/*` in the repository workspace:

- `examples/hono-counter` — a minimal Hono counter using TSX views, Datastar action helpers, and `reply.*` responses.
- `examples/hono-modal` — a Hono + TSX app showing a server-rendered native dialog controlled by Datastar signals.
- `examples/deno-search-list` — a Deno app using standard HTTP routing, Tailwind CSS, search patches, and append-based list updates.

From the repository root:

```sh
pnpm run dev:hono-counter
pnpm run dev:hono-modal
pnpm run dev:deno-search-list
```

Open <http://127.0.0.1:3000>.

## Documentation

Longer-form documentation starts at [the documentation index](docs.md).

## Related Work

- [Datastar](https://data-star.dev/) — the browser runtime and hypermedia protocol this SDK targets.
- [Datastar SDK reference](https://data-star.dev/reference/sdks) — official SDK overview across languages.
- [Standard Schema](https://standardschema.dev/) — validator-agnostic schema interface used by optional signal validation.

## License

MIT
