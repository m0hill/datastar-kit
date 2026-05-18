# ts-star

Exploratory TypeScript + Effect + Datastar framework prototype.

This is intentionally small. The current shape favors explicit backend-driven HTML/SSE over a full frontend framework or a large server abstraction.

## Current architecture

- `src/client.ts` — helpers for script tags, full Datastar documents/pages, serving in-memory or file-backed self-hosted Datastar client assets, and pairing exact routes with that asset route.
- `src/response.ts` — Web `Response` helpers for empty command responses, rendered HTML nodes, Datastar SSE patches/streams, and direct `text/html`, `application/json`, and `text/javascript` action responses with status/header customization.
- `src/sse.ts` — pure Datastar SSE event encoding (`patchElements`, `patchSignals`, `removeSignals`, `executeScript`). Tested against included Datastar SDK fixtures.
- `src/datastar.ts` — typed signal/action/attribute/style helpers for generating/composing Datastar expressions and action URLs, validating signal names, merging attributes, inspector/ref/ignore helpers, object-form bindings, modifier suffixes, and `data-*` attributes.
- `src/html.ts` — tiny HTML builder/renderer and document helper used while templating choices are still open.
- `src/jsx.ts` — experimental classic JSX factory that renders through the same HTML nodes.
- `src/request.ts` — detects Datastar action requests, reads Datastar signals/query params from Web `Request`s, decodes them with Effect Schema, and exposes request abort helpers.
- `src/handler.ts` — plain Effect handlers returning Web `Response`s, plus exact-route dispatch, route prefixing, typed error mapping, and `withSignals`.
- `src/node.ts` — boundary adapter plus unscoped/scoped serve helpers from `node:http` to Web `Request`/`Response`; runtime helpers refuse handlers with unprovided Effect context instead of erasing it.
- `src/platform.ts` — adapter from ts-star Web handlers/routes to `@effect/platform` HTTP apps/routers, native Effect Platform signal decoding, and native Datastar SSE/direct response helpers, so prototypes can run through Effect's `NodeHttpServer` instead of only raw Node plumbing.
- `src/realtime.ts` — optional Effect `PubSub`/`Stream` helpers for CQRS-style live updates with customizable streaming response headers.

## Minimal counter

```ts
import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
  dataSignals,
  h,
  htmlResponse,
  mergeAttrs,
  on,
  patchSignalsResponse,
  post,
  render,
  route,
  router,
  signal,
  text,
  withSignals
} from "ts-star"

const CounterSignals = Schema.Struct({ count: Schema.Number })

const counterView = () => {
  const count = signal<number, "count">("count")
  return render(
    h(
      "main",
      mergeAttrs({ id: "counter" }, dataSignals({ count: 0 }, { ifMissing: true })),
      h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
      h("output", text(count), "0")
    )
  )
}

const increment = withSignals(CounterSignals, (signals) =>
  Effect.succeed(patchSignalsResponse({ count: signals.count + 1 }))
)

export const app = router(
  route("GET", "/", () => Effect.succeed(htmlResponse(counterView()))),
  route("POST", "/increment", increment)
)
```

See `examples/counter.ts` for the smallest full-page Effect Platform signal patch flow, `examples/tsx-counter.tsx` for the same style of counter written with TSX instead of hyperscript calls, `examples/search.ts` for query decoding + direct HTML patch responses, and `examples/live-counter.ts` for PubSub-backed SSE patches.

## Checking examples

Use the focused package scripts when changing examples:

```sh
pnpm run check:examples
pnpm run check:example:counter
pnpm run check:example:tsx-counter
pnpm run check:example:search
pnpm run check:example:live-counter
```

The `check:*` scripts run `typecheck` first, then the matching example test. Use `test:examples` or `test:example:*` when you only need Vitest.

## Running example dev servers

Each dev script builds the TypeScript examples, then starts one example through Effect Platform's Node HTTP server. Dev examples load Datastar from the CDN, so they do not need a local `/datastar.js` asset route:

```sh
pnpm run dev:counter
pnpm run dev:tsx-counter
pnpm run dev:search
pnpm run dev:live-counter
```

The default address is `http://127.0.0.1:3000`. Override it with `PORT=4000` or `HOST=0.0.0.0`.

## Open questions

- Should JSX remain a thin alternative over the builder, or should the builder stay the primary API?
- How far should the typed expression DSL go before it becomes its own language?
- Should CQRS/fat-morph live streams remain optional helpers or become a blessed app pattern?
