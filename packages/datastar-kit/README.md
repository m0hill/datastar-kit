# datastar-kit

Independent TypeScript helpers for building server-driven [Datastar](https://data-star.dev/) UIs with Web Standard `Request` and `Response` primitives.

Datastar Kit helps you author Datastar attributes, read signal payloads, render small server-side HTML/JSX views, and return Datastar-compatible responses from any fetch-compatible server or router.

## Features

- **Datastar helpers** — `ds` mirrors common Datastar actions, attributes, signals, expressions, and modifiers.
- **Server-side JSX** — use `jsxImportSource: "datastar-kit"` for small server-rendered view functions.
- **Native responses** — `reply` returns standard `Response` objects for pages, patches, signals, streams, direct responses, navigation, and `204` completion.
- **SSE-first updates** — normal UI updates use `text/event-stream`; direct responses remain explicit escape hatches.
- **Signal reads** — parse Datastar's JSON signal transport into a checked JSON object signal tree.
- **Framework-friendly** — compose the helpers inside Hono, Workers, Bun, Deno, Node, or any fetch-compatible HTTP layer.

## Installation

```sh
npm i datastar-kit
```

Add the Datastar browser runtime to your HTML from a pinned CDN URL or from your own served copy of `@starfederation/datastar`.

For JSX, configure TypeScript once:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "datastar-kit"
  }
}
```

## Quick start

A Datastar Kit handler is just `Request -> Response`.

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

Import the Datastar helper namespace as `ds`.

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

Use `ds.expr` when you need a client-side expression. Template interpolation serializes signal refs and JavaScript literals consistently.

```tsx
const count = ds.signal<number>("count")

<button {...ds.dataAttr("disabled", ds.expr`${count} >= ${10}`)}>+</button>
```

For app-specific browser behavior that gets awkward as an inline expression, you can register a Datastar action in a browser module and call it from TSX with `ds.action(...)`.

```tsx
const modalOpen = ds.signal<boolean>("modalOpen")

<button {...ds.on("click", ds.action("setSignal", modalOpen.name, true))}>Open</button>
<dialog {...ds.effect(ds.action("syncDialog", modalOpen))}>...</dialog>
```

## Reading signals

`read.signals(request)` parses Datastar's JSON transport and checks that the result is a JSON object signal tree.

```ts
import { read } from "datastar-kit"

const signals = await read.signals(request)
```

For user input, validate the decoded signal state at the request boundary with the schema library your app already uses.

```ts
import { z } from "zod"
import { read, reply } from "datastar-kit"

const CounterSignals = z.object({ count: z.number() })

export async function increment(request: Request): Promise<Response> {
  const { count } = CounterSignals.parse(await read.signals(request))
  return reply.signals({ count: count + 1 })
}
```

Transport details are hidden: `GET` and `DELETE` read the `datastar` query parameter; other methods read the request body as JSON.

## Responses

`reply` helpers return native `Response` objects. Datastar action helpers own their protocol status codes, so protocol options and native response options are separate.

```tsx
reply.patch(<Count />, { selector: "#count" }, { headers: { "x-action": "increment" } })
reply.signals({ saving: false }, { onlyIfMissing: true }, { headers: { "x-action": "save" } })
```

Common helpers:

- `reply.page(body, options, init)` — full HTML document response. `init` is normal `ResponseInit`, including `status`.
- `reply.patch(view, options, init)` — SSE element patch response.
- `reply.signals(state, options, init)` — SSE signal patch response.
- `reply.stream(events, options, init)` — multiple or long-lived SSE event chunks.
- `reply.done(init)` — `204` command completion with no body.
- `reply.navigate(url, options, init)` — safe Datastar-driven navigation.

For ordinary component updates, the element `id` is the patch contract. Render a stable `id` on each top-level element you return, then omit `selector`. Pass `selector` when targeting a container or CSS match, such as appending to a list or removing elements.

```tsx
const Count = () => <output id="count">{count}</output>

reply.patch(<Count />)
reply.patch(<TodoItem todo={todo} />, { selector: "#todos", mode: "append" })
```

The initial page and later patches should render the same stable IDs for the same UI regions. Live streams use the same rule. The website docs include a visual guide to every patch mode in [`../website/guides/patch-elements.md`](../website/guides/patch-elements.md).

## Streaming events

Use `event.*` helpers to build rendered SSE chunks for `reply.stream`.

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

SSE helpers are the recommended default. Direct responses remain available for integrations that specifically need Datastar's direct-response handling.

- `reply.directHtml(html, options, init)`
- `reply.directSignals(state, options, init)`
- `reply.directScript(script, options, init)`

Security note: only pass trusted or sanitized HTML to `unsafeHtml` / `directHtml`, and only pass trusted script text to `directScript`. Prefer `reply.navigate` for navigation and structured patches for ordinary UI updates.

## Low-level HTML

JSX is the primary authoring path. Low-level helpers are available for tests, code generation, and non-JSX environments.

```ts
import { ds, h, mergeProps, renderToString } from "datastar-kit"

const view = h("button", mergeProps({ type: "button" }, ds.on("click", ds.post("/save"))), "Save")
const html = renderToString(view)
```

## Examples

Standalone examples live under `examples/*` in the repository workspace.

- [`examples/hono-counter`](../../examples/hono-counter) — a minimal Hono counter using TSX views, Datastar action helpers, and `reply.*` responses.
- [`examples/hono-modal`](../../examples/hono-modal) — a Hono + TSX app showing a server-rendered native dialog controlled by Datastar signals.
- [`examples/hono-form-validation`](../../examples/hono-form-validation) — a Hono + TSX app showing signal binding and server-side validation.
- [`examples/hono-custom-actions`](../../examples/hono-custom-actions) — a Hono + TSX app showing custom Datastar actions/plugins for client-side behavior.
- [`examples/elysia-layout`](../../examples/elysia-layout) — a Bun/Elysia app showing layout composition, named JSX slots, and focused Datastar patches.
- [`examples/deno-search-list`](../../examples/deno-search-list) — a Deno app using `@std/http`, Tailwind CSS, search patches, and append-based list updates.

From the repository root:

```sh
pnpm run dev:hono-counter
pnpm run dev:hono-modal
pnpm run dev:hono-form-validation
pnpm run dev:hono-custom-actions
pnpm run dev:elysia-layout
pnpm run dev:deno-search-list
```

Open the logged URL, usually <http://localhost:3000>.

## Documentation

Longer-form documentation lives in the VitePress site at [`../website`](../website).

## Related work

- [Datastar](https://data-star.dev/) — the browser runtime and hypermedia protocol this SDK targets.
- [Datastar SDK reference](https://data-star.dev/reference/sdks) — official SDK overview across languages.

## License

[MIT](LICENSE) © Mohil
