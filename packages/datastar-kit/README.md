# datastar-kit

`datastar-kit` is a small TypeScript companion SDK for [Datastar](https://data-star.dev/).

It provides typed helpers for Datastar attributes/actions/signals, server-rendered TSX/HTML, signal payload reads from `Request`, and native `Response` helpers for Datastar patches and streams.

[Documentation](https://datastar-kit.mohil.dev) · [GitHub](https://github.com/m0hill/datastar-kit) · [Datastar](https://data-star.dev/)

## Install

```sh
npm i datastar-kit
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
import { ds, reply } from "datastar-kit"

let count = 0

const Counter = () => (
  <main>
    <button type="button" {...ds.on("click", ds.post("/increment"))}>
      Increment
    </button>
    <output id="count">{count}</output>
  </main>
)

export function handle(request: Request): Response {
  const url = new URL(request.url)

  if (request.method === "GET" && url.pathname === "/") {
    return reply.page(<Counter />)
  }

  if (request.method === "POST" && url.pathname === "/increment") {
    count += 1
    return reply.patch(<output id="count">{count}</output>)
  }

  return new Response("Not Found", { status: 404 })
}
```

The stable `id` is the patch contract. The server returns new HTML for `#count`; Datastar applies it in the browser.

See [datastar-kit.mohil.dev](https://datastar-kit.mohil.dev) for guides, API notes, and examples.

## License

[MIT](LICENSE) © Mohil
