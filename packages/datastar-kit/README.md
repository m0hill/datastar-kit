# datastar-kit

`datastar-kit` is a small TypeScript SDK for building server-driven UI with [Datastar](https://data-star.dev/).

It provides typed helpers for Datastar actions, expressions, and signal refs; native Datastar attributes in server-rendered TSX; signal payload reads from `Request`; native `Response` helpers for Datastar pages, patches, streams, navigation, and command completion; and a development-only debugger Web Component.

It is not a framework. Bring your router, auth, database, validation, sessions, and runtime.

[Documentation](https://datastar-kit.dev) · [GitHub](https://github.com/m0hill/datastar-kit) · [Datastar](https://data-star.dev/)

## Install

```sh
npm i datastar-kit
```

Datastar Kit does not bundle, install, or serve the Datastar browser runtime. This release is written and tested against Datastar `v1.0.2`; use a pinned runtime URL or a self-hosted compatible copy.

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"
></script>
```

For TSX views, set `jsxImportSource`:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "datastar-kit"
  }
}
```

## Example

```tsx
import { post, reply } from "datastar-kit"

const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.2/bundles/datastar.js"

let count = 0

const Counter = () => (
  <main>
    <button
      type="button"
      data-on:click={post("/increment")}
    >
      Increment
    </button>
    <output id="count">{count}</output>
  </main>
)

export function handle(request: Request): Response {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") {
    return reply.page(<Counter />, {
      title: "Counter",
      head: (
        <script
          type="module"
          src={DATASTAR_RUNTIME}
        />
      )
    })
  }

  if (request.method === "POST" && url.pathname === "/increment") {
    count += 1
    return reply.patch(<output id="count">{count}</output>)
  }

  return new Response("Not Found", { status: 404 })
}
```

The stable `id` is the patch contract. The server returns new HTML for `#count`; Datastar applies it in the browser.

## Development debugger

Load the debugger from a development-only browser entrypoint to inspect signals, events, and timeline snapshots.

```ts
import "datastar-kit/debugger"
```

Keep this entrypoint out of production builds and pages.

See [datastar-kit.dev](https://datastar-kit.dev) for guides, API reference, and examples.

## License

[MIT](LICENSE) © Mohil
