# ts-star

Exploratory TypeScript + Effect + Datastar framework prototype.

`ts-star` is intentionally small and server-driven. It keeps low-level Datastar helpers available while building toward a layered framework where backend state is the source of truth, Effect owns runtime/lifecycle concerns, and Datastar applies HTML/signal patches in the browser.

See [`docs/architecture.md`](docs/architecture.md) for the architecture baseline and public module boundary proposal. See [`docs/datastar-protocol.md`](docs/datastar-protocol.md) for Datastar action response status semantics and form decoding policy. See [`docs/programming-model.md`](docs/programming-model.md) for the backend-state/CQRS model. See [`docs/runtime.md`](docs/runtime.md) for the Effect-native service/layer runtime. See [`docs/type-contracts.md`](docs/type-contracts.md) for schema-derived signal and action contracts. See [`docs/html-rendering.md`](docs/html-rendering.md) for the renderer boundary, ordered attributes, raw HTML, and JSX status. See [`docs/signals.md`](docs/signals.md) for signal policy, scoping, and sensitive-data guidance. See [`docs/live-queries.md`](docs/live-queries.md) for reconnect-safe current-state realtime. See [`docs/security.md`](docs/security.md) for request lifecycle, CSRF/auth hooks, limits, aborts, and safe navigation.

## Current architecture

The package root exports each module as a namespace (`Sse`, `Contracts`, `Datastar`, `Html`, `Jsx`, `Model`, `Platform`, `Realtime`, `Runtime`, `Client`) and also re-exports their named helpers for small examples.

- `src/sse.ts` — pure Datastar SSE event encoding: element patches, signal patches, signal removal, script execution, and event stream concatenation.
- `src/contracts.ts` — Effect Schema-derived signal contracts, typed signal patches, and route/action helper prototypes.
- `src/datastar.ts` — typed Datastar expressions, signal references, signal policy/scoping helpers, fetch actions, modifiers, attribute helpers, merge helpers, and signal-name validation.
- `src/html.ts` — tiny HTML node builder/renderer plus renderer interface, ordered attributes, explicit raw HTML, patchable ID helpers, and full document helper.
- `src/jsx.ts` — experimental classic JSX factory that renders through the same HTML node model.
- `src/platform.ts` — Effect Platform HTTP integration: route composition, Datastar request detection, signal/query/form decoding with Effect Schema, generic HTTP helpers, and Datastar-safe action response helpers.
- `src/model.ts` — minimal backend-state/CQRS helpers for command completion, current-view patches, and live queries with render-on-connect, heartbeat response support, and invalidation coalescing.
- `src/runtime.ts` — Effect-native service tags/layers for config, HTML rendering, Datastar protocol responses, request context, signal decoding, error mapping, and live-query invalidation hubs.
- `src/security.ts` — request security helpers for CSRF integration, auth context, body limits, abort signals, and safe navigation URL/script generation.
- `src/realtime.ts` — optional Effect `PubSub`/`Stream` helpers, heartbeats, and live element patch responses.
- `src/client.ts` — Datastar script/document helpers and Effect Platform routes for serving a pinned Datastar client asset.

## Layered model

`ts-star` is organized around four layers:

1. **Protocol layer** — Datastar wire format and response semantics (`Sse`, protocol-facing `Platform` helpers).
2. **View layer** — server-rendered HTML and Datastar attributes (`Html`, `Jsx`, `Datastar`, `Client`).
3. **Runtime layer** — Effect request decoding, responses, scopes, streams, and realtime resources (`Platform`, `Realtime`).
4. **Programming model layer** — backend-source-of-truth commands, query views, and live queries (`Model`).

All four layers now exist in small form; the programming model layer is intentionally minimal while the higher-level page/action DSL remains open.

## Minimal counter

```ts
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import {
  datastarDocument,
  datastarPatchElementsResponse,
  h,
  mergeAttrs,
  on,
  platformHtmlResponse,
  platformRouter,
  post
} from "ts-star"

let count = 0

const countNode = () => h("output", { id: "count" }, count)

const counterNode = () =>
  h(
    "main",
    { id: "counter" },
    h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
    countNode()
  )

const page = () => platformHtmlResponse(datastarDocument(counterNode()))

const increment = Effect.sync(() => {
  count += 1
  return datastarPatchElementsResponse(countNode(), { selector: "#count", mode: "outer" })
})

export const app = platformRouter(
  HttpRouter.route("GET", "/", page()),
  HttpRouter.route("POST", "/increment", increment)
)
```

See `examples/counter.ts` for the smallest backend-state element patch flow, `examples/tsx-counter.tsx` for a TSX syntax variant, `examples/search.ts` for appropriate query-input signals and direct HTML patch responses, `examples/live-counter.ts` for current-state live queries, and `examples/runtime-counter.ts` for service/layer-based runtime wiring.

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

Each dev script builds the TypeScript examples, copies the pinned vendored Datastar client into `dist/vendor/datastar.js`, then starts one example through Effect Platform's Node HTTP server. The dev server serves that framework-pinned client at `/datastar.js`:

```sh
pnpm run dev:counter
pnpm run dev:tsx-counter
pnpm run dev:search
pnpm run dev:live-counter
```

The default address is `http://127.0.0.1:3000`. Override it with `PORT=4000` or `HOST=0.0.0.0`.

## Design constraints

- Backend state should be the durable source of truth.
- Datastar signals should stay sparse and mostly ephemeral.
- Effect should model runtime dependencies, typed errors, scopes, concurrency, and streams.
- Server-rendered HTML should remain compatible with external renderer adapters.
- `ts-star` should not become a virtual DOM runtime, client router, React-style lifecycle system, complex browser store, or plugin-heavy frontend framework clone.

## Open questions

- What exact shape should the future `Page`, `Action`, and `LiveQuery` APIs take?
- How far should the typed expression DSL go before it becomes its own language?
- Which renderer style should be documented as the default once adapters exist?
