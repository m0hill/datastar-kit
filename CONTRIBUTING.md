# Contributing

Thanks for your interest in Datastar Kit. This guide is for working on the SDK itself. If you only want to _use_ Datastar Kit, read the [documentation](https://datastar-kit.dev) instead.

## Prerequisites

- Node.js (current LTS or newer)
- [pnpm](https://pnpm.io) — the version is pinned in `package.json` (`packageManager`); run with [Corepack](https://nodejs.org/api/corepack.html) (`corepack enable`)

## Setup

```sh
pnpm install
```

This is a pnpm workspace. The SDK lives in `packages/datastar-kit`, the docs site in `packages/website`, and runnable integrations in `examples/*`.

## Common commands

Run these from the repository root:

| Command          | What it does                                                     |
| ---------------- | ---------------------------------------------------------------- |
| `pnpm test`      | Run the SDK test suite (Vitest) plus example tests.              |
| `pnpm typecheck` | Type-check the SDK, every example, and the website.              |
| `pnpm build`     | Build the SDK and all example/website outputs.                   |
| `pnpm lint`      | Lint with oxlint (`pnpm lint:fix` to autofix).                   |
| `pnpm format`    | Format with oxfmt.                                               |
| `pnpm check`     | Full gate: `build` + `typecheck` + `test`. Run this before a PR. |

To work on a single package, filter to it, e.g. `pnpm --filter datastar-kit test` or `pnpm --filter datastar-kit typecheck`.

## Running examples and the docs site

```sh
pnpm dev:website          # docs site at packages/website
pnpm dev:hono-counter     # smallest example
pnpm dev:hono-todos       # todo app with request/response tests
```

See the `dev:*` scripts in the root `package.json` for the full list (Hono, Elysia, Deno, Bun, and Cloudflare Workers examples).

## Repository layout

```
packages/datastar-kit   # the published SDK
packages/website        # docs site (datastar-kit.dev)
examples/*              # standalone workspace packages, one integration each
```

Documentation pages live in `packages/website/content/docs/*.md` and are compiled to `packages/website/src/generated/docs.ts` by `scripts/build-docs.ts`. Edit the Markdown, not the generated file. Keep docs **user-facing** — contributor-only material (like this guide) stays at the repo root, not in the docs site.

## SDK source layout

`packages/datastar-kit/src` is organized by concern:

### Datastar protocol

- `sse.ts` — low-level Datastar SSE event and comment encoders.
- `event.ts` — renders HTML nodes into Datastar SSE chunks for streams.
- `reply.ts` — turns rendered HTML and SSE chunks into native `Response` objects.
- `navigation.ts` — builds safe navigation scripts used by the navigation helpers.

### HTML and JSX

- `html.ts` — the internal HTML node model plus `renderToString` and `unsafeHtml`.
- `html-attributes.ts` — attribute typing and serialization metadata for intrinsic elements.
- `jsx-runtime.ts` / `jsx-dev-runtime.ts` — automatic JSX runtime entrypoints.
- `jsx.ts` — adapts JSX calls into the HTML node model.

### Datastar authoring (`src/ds`)

- `index.ts` — internal barrel re-exported by the root package.
- `actions.ts` — Datastar action expressions (`get`, `post`, ...).
- `expression.ts` — Datastar expression serialization (`js`, `regex`).
- `signals.ts` — signal refs and name validation.
- `state.ts` — typed helpers around grouped signal defaults.
- `attributes.ts`, `attribute-metadata.ts`, `attribute-types.ts`, `modifiers.ts`, `modifier-rendering.ts` — `data-*` attribute typing and modifier rendering.

### Request boundary

- `read.ts` — decodes Datastar signal payloads from native `Request` values. Generic query params, form posts, multipart uploads, JSON APIs, auth, and request context stay in the consuming app.

### Other

- `debugger/` — the development-only debugger Web Component, recorder, and Datastar signal bridge.
- `index.ts` / `types.ts` — public root exports and shared types.

## Design constraints

These keep the SDK small; please preserve them in new work:

- Public APIs stay close to Web Standard primitives: `Request`, `Response`, `Headers`, `URL`, and `ReadableStream`.
- Datastar remains the browser runtime and patch protocol. The SDK serializes typed values for native Datastar attributes and generates actions, SSE events, and direct responses — it does not ship its own browser runtime.
- Server-rendered HTML is the primary UI payload. TSX compiles to the small HTML node model; there is no virtual DOM or hydration.
- SSE patches are the default response style. Direct responses exist only for integrations that need them.
- Signals are browser-side input and feedback, not the durable state model for an application.
- Framework concerns (routing, auth, sessions, databases, deployment) stay outside the package.

## Pull requests

1. Branch from `main`.
2. Make the change, with tests for new behavior.
3. Run `pnpm check` and `pnpm lint` until clean.
4. If you changed public API or behavior, update the relevant docs under `packages/website/content/docs`.
5. Open a PR with a clear description of the change and its motivation.

MIT licensed. By contributing you agree your work is released under the same license.
</content>
