# Datastar Kit

Datastar Kit is a small TypeScript companion SDK for [Datastar](https://data-star.dev/).

It provides typed APIs for the Datastar parts of a server-driven app: authoring attributes/actions/signals in TSX, reading signal payloads from `Request`, rendering server HTML, and returning native `Response` objects that Datastar can patch into the page.

It is not a framework. Bring your own router, auth, database, validation, and runtime.

[Documentation](https://datastar-kit.mohil.dev) · [Examples](examples) · [Datastar](https://data-star.dev/)

## Example

```tsx
import { ds, reply } from "datastar-kit"

const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

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
    return reply.page(<Counter />, {
      head: <script type="module" src={DATASTAR_RUNTIME} />
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

## Install

```sh
npm i datastar-kit
```

Datastar Kit does not bundle, install, or serve the Datastar browser runtime. This release is written and tested against Datastar `v1.0.1`; use a pinned runtime URL or a self-hosted copy compatible with that version.

```html
<script
  type="module"
  src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"
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

See [datastar-kit.mohil.dev](https://datastar-kit.mohil.dev) for setup, guides, API notes, and examples.

## Repository

```sh
pnpm install
pnpm run check
```

- SDK package: [`packages/datastar-kit`](packages/datastar-kit)
- Documentation site: [`packages/website`](packages/website)
- Runnable examples: [`examples`](examples)

## License

[MIT](LICENSE) © Mohil
