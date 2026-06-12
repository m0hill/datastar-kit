# datastar-kit.dev

The documentation site for Datastar Kit, built with Datastar Kit itself: a Hono app rendering
server-side TSX, deployed as a Cloudflare Worker.

## How it works

- `content/` holds the Markdown docs. They are the source of truth and stay plain GFM.
- `scripts/build-docs.ts` compiles the Markdown at build time into `src/generated/docs.ts`:
  rendered HTML (markdown-it + Shiki highlighting), titles, headings, and plain-text sections
  for search. The worker never parses Markdown at runtime.
- `src/index.tsx` is the Hono app. It registers one route per compiled doc page plus the
  landing page, the playground, docs search (`GET /search`), and the live demo endpoints.
- `src/styles.css` is the Tailwind v4 input; `@tailwindcss/cli` compiles it to
  `public/styles.css`, which Wrangler serves as a static asset together with the self-hosted
  Geist fonts.

## Commands

```sh
pnpm dev      # build docs + css, then wrangler dev with content/css watchers
pnpm build    # compile docs manifest and css
pnpm check    # build + typecheck
pnpm deploy   # build and deploy the worker
```

Editing a file in `content/` while `pnpm dev` runs regenerates the manifest and reloads the
worker. New pages also need a sidebar entry in `src/nav.ts`.
