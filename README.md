# ts-star

Exploratory TypeScript + Effect + Datastar framework prototype.

`ts-star` is intentionally small and server-driven. It keeps low-level Datastar helpers available while building toward a layered framework where backend state is the source of truth, Effect owns runtime/lifecycle concerns, and Datastar applies HTML/signal patches in the browser.

See [`docs/architecture.md`](docs/architecture.md) for the architecture baseline and public module boundary proposal. See [`docs/public-api.md`](docs/public-api.md) and [`docs/api-reference.md`](docs/api-reference.md) for stable/experimental modules, extension points, and API maps. See [`docs/examples.md`](docs/examples.md) for the tested reference examples. See [`docs/datastar-philosophy.md`](docs/datastar-philosophy.md) and [`docs/datastar-protocol.md`](docs/datastar-protocol.md) for Datastar philosophy and response semantics. See [`docs/actions-commands.md`](docs/actions-commands.md), [`docs/programming-model.md`](docs/programming-model.md), and [`docs/runtime.md`](docs/runtime.md) for backend-state commands and Effect services. See [`docs/type-contracts.md`](docs/type-contracts.md), [`docs/html-rendering.md`](docs/html-rendering.md), [`docs/signals.md`](docs/signals.md), [`docs/live-queries.md`](docs/live-queries.md), [`docs/security.md`](docs/security.md), [`docs/errors-validation.md`](docs/errors-validation.md), [`docs/observability-testing.md`](docs/observability-testing.md), [`docs/deployment.md`](docs/deployment.md), and [`docs/performance-deployment.md`](docs/performance-deployment.md) for focused guides.

## Current architecture

The package root exposes small contextual namespaces such as `ds`, `read`, `reply`, and `contract`, plus tiny top-level HTML helpers (`h`, `render`, `fragment`, `raw`, `props`, `page`). JSX is an explicit experimental adapter, not a root API.

- `src/sse.ts` — pure Datastar SSE event encoding: element patches, signal patches, signal removal, script execution, and event stream concatenation.
- `src/contract.ts` — narrow Effect Schema-derived signal contracts: typed signal refs, initial props, and typed patches.
- `src/ds.ts` / `src/datastar.ts` — thin Datastar mirrors for expressions, signal references, fetch actions, modifiers, and attributes.
- `src/html.ts` — tiny HTML node builder/renderer: `h`, `render`, `fragment`, `raw`, `props`, and `page`.
- `src/jsx.ts` — experimental JSX adapter over the same HTML node model.
- `src/platform.ts` — Effect Platform HTTP integration: route composition, Datastar request detection, signal/query/form decoding with Effect Schema, and generic HTTP helpers still under cleanup.
- `src/read.ts` — concise request-boundary signal/query decoding helpers over Effect Platform.
- `src/reply.ts` — Datastar-safe response helpers: pages, SSE patches, event streams, no-content command completion, safe navigation, and explicit direct-response escape hatches.
- `src/live.ts` — current-state live queries that emit Datastar element patch events and compose with `reply.stream`.
- `src/client.ts` — Datastar script/document helpers and Effect Platform routes for serving a pinned Datastar client asset.

Validation is demonstrated as an app-local recipe. Auth/session/CSRF/request limits are app-owned boundary concerns. Observability should use Effect/OpenTelemetry directly rather than a `ts-star` facade.

## Layered model

`ts-star` is organized around four layers:

1. **Protocol layer** — Datastar wire format and response semantics (`Sse`, protocol-facing `Platform` helpers).
2. **View layer** — server-rendered HTML helpers, Datastar attributes (`ds`), optional JSX adapter, and client document helpers.
3. **Runtime layer** — Effect request decoding, responses, scopes, and app-owned streams (`read`, `reply`, `Platform`).
4. **Programming model layer** — backend-source-of-truth commands, query views, and current-state live queries (`live`).

The programming model layer is intentionally minimal while any higher-level page/action DSL remains open.

## Minimal counter

```ts
import * as Effect from "effect/Effect"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import {
  ds,
  h,
  props,
  platformRouter,
  reply
} from "ts-star"

let count = 0

const countNode = () => h("output", { id: "count" }, count)

const counterNode = () =>
  h(
    "main",
    { id: "counter" },
    h("button", props({ type: "button" }, ds.on("click", ds.post("/increment"))), "+"),
    countNode()
  )

const page = () => reply.page(counterNode())

const increment = Effect.sync(() => {
  count += 1
  return reply.patch(countNode(), { selector: "#count", mode: "outer" })
})

export const app = platformRouter(
  HttpRouter.route("GET", "/", page()),
  HttpRouter.route("POST", "/increment", increment)
)
```

See `examples/counter.ts` for the smallest backend-state element patch flow, `examples/tsx-counter.tsx` for a TSX syntax variant, `examples/search.ts` for query-input signals, `examples/live-counter.ts` for current-state live queries, `examples/runtime-counter.ts` for app-owned Effect services, and `examples/validation-form.ts` for recoverable validation patches.

## Checking examples

Use the focused package scripts when changing examples:

```sh
pnpm run check:examples
pnpm run check:example:counter
pnpm run check:example:tsx-counter
pnpm run check:example:search
pnpm run check:example:live-counter
pnpm run check:example:runtime-counter
pnpm run check:example:validation-form
```

The `check:*` scripts run `typecheck` first, then the matching example test. Use `test:examples` or `test:example:*` when you only need Vitest.

## Running example dev servers

Each dev script builds the TypeScript examples, copies the pinned vendored Datastar client into `dist/vendor/datastar.js`, then starts one example through Effect Platform's Node HTTP server. The dev server serves that framework-pinned client at `/datastar.js`:

```sh
pnpm run dev:counter
pnpm run dev:tsx-counter
pnpm run dev:search
pnpm run dev:live-counter
pnpm run dev:runtime-counter
pnpm run dev:validation-form
```

The default address is `http://127.0.0.1:3000`. Override it with `PORT=4000` or `HOST=0.0.0.0`.

## Design constraints

- Backend state should be the durable source of truth.
- Datastar signals should stay sparse and mostly ephemeral.
- Effect should model runtime dependencies, typed errors, scopes, concurrency, and streams.
- Server-rendered HTML should stay simple; external renderers can pass rendered strings at response boundaries.
- `ts-star` should not become a virtual DOM runtime, client router, React-style lifecycle system, complex browser store, or plugin-heavy frontend framework clone.

## Open questions

- What exact shape should future `Page` and `Action` APIs take?
- How far should the typed expression DSL go before it becomes its own language?
- Whether real-world usage justifies a public renderer adapter later.
