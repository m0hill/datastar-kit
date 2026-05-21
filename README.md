# Datastar Kit

Datastar Kit is an independent TypeScript companion SDK for building server-driven Datastar UI with Web Standard `Request` and `Response` primitives.

This repository is a pnpm workspace containing the publishable SDK package, documentation site, and examples.

## Workspace packages

- [`packages/datastar-kit`](packages/datastar-kit) — the publishable SDK package, including source, tests, and package README.
- [`packages/website`](packages/website) — the VitePress documentation site.
- [`examples/hono-counter`](examples/hono-counter) — a standalone Hono counter example that consumes `datastar-kit` through a workspace dependency.

## SDK quick look

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
      </main>
    )
  }

  if (request.method === "POST" && url.pathname === "/increment") {
    count += 1
    return reply.patch(<output id="count">{count}</output>)
  }

  return new Response("Not Found", { status: 404 })
}
```

Read the package documentation at [`packages/datastar-kit/README.md`](packages/datastar-kit/README.md).

## Common commands

Install dependencies:

```sh
pnpm install
```

Run all checks:

```sh
pnpm run check
```

Run individual tasks:

```sh
pnpm run build
pnpm run typecheck
pnpm test
```

Run local development servers:

```sh
pnpm run dev:hono-counter
pnpm run dev:website
```

## Repository layout

```text
packages/
  datastar-kit/   # SDK source and package README
  website/        # VitePress docs
examples/
  hono-counter/   # Example app consuming the workspace package
```

Additional standalone examples can be added as new packages under `examples/*`.

## License

[MIT](LICENSE) © Mohil
