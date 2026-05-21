# Getting Started

Datastar Kit is a small TypeScript companion SDK for building server-driven Datastar UI with Web Standard `Request` and `Response` primitives.

Use it when your server owns the important state, Datastar handles browser events and patches, and you want predictable glue code: typed attributes, typed signal refs, native responses, and server-rendered HTML/JSX that can run in any fetch-compatible handler.

Datastar Kit does **not** try to be your router, auth layer, database adapter, session store, queue, or observability stack. Bring the platform pieces you already like; use this package for the Datastar-shaped parts.

## Install

```sh
npm i datastar-kit
```

Add the Datastar browser runtime to your HTML from a pinned CDN URL or from your own served copy.

For JSX, configure TypeScript once:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "datastar-kit"
  }
}
```

## Tiny Counter

A handler can be just a function that receives a native `Request` and returns a native `Response`:

```tsx
import { ds, reply } from "datastar-kit"

const DATASTAR_RUNTIME = "/vendor/datastar.js"
let count = 0

export function handle(request: Request): Response {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") {
    return reply.page(
      <main id="counter">
        <h1>Fetch counter</h1>
        <button type="button" {...ds.on("click", ds.post("/increment"))}>
          Increment
        </button>{" "}
        <output id="count">{count}</output>
      </main>,
      {
        title: "Fetch counter",
        head: <script type="module" src={DATASTAR_RUNTIME} />
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

The interesting bit is the patch response. The returned `<output id="count">` has the same `id` as the element already on the page, so Datastar can update that element without a client-side component tree.

## Main Pieces

- `ds` builds Datastar attributes, actions, expressions, modifiers, and typed signal refs.
- `read` decodes Datastar signal payloads from a `Request`.
- `reply` returns native `Response` objects for pages, patches, signal patches, streams, navigation, and `204` command completion.
- `event` builds individual SSE chunks for `reply.stream(...)`.
- The JSX runtime and low-level HTML helpers render server HTML without adding a browser framework.

## Rules Of Thumb

- Durable state lives in backend resources. Browser signals are request input and local UI feedback.
- Most UI updates are `reply.patch(<View id="stable-id" />)`.
- Use `selector` when targeting a container, sibling position, multiple matches, or removal.
- Use `reply.done()` when a command succeeded and the page does not need immediate feedback.
- Use `reply.stream(...)` for live views; render current backend state on connect so reconnects recover cleanly.
- Treat direct-response helpers as integration escape hatches. Start with the SSE helpers unless you specifically need direct-response headers.

## Where To Go Next

Start with the [documentation index](docs.md), or jump straight to the page that matches your next question:

- [Programming model](concepts/programming-model.md) for the server-driven mental model.
- [HTML and JSX](guides/html-and-jsx.md) for layouts, views, escaping, and low-level helpers.
- [Signals](guides/signals.md) for authoring and reading Datastar signal state.
- [Actions and responses](guides/actions-and-responses.md) for command flow, status semantics, and response helpers.
- [Patch elements](guides/patch-elements.md) for every DOM patch mode.
- [Examples](guides/examples.md) for runnable workspace apps.

## Links

- [GitHub repository](https://github.com/m0hill/datastar-kit)
- [Datastar](https://data-star.dev/)

## License

MIT
