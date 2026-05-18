# ts-star

Exploratory TypeScript + Effect + Datastar framework prototype.

`ts-star` is intentionally small and server-driven. It keeps low-level Datastar helpers available while building toward a layered framework where backend state is the source of truth, Effect owns runtime/lifecycle concerns, and Datastar applies HTML/signal patches in the browser.

See [`docs/architecture.md`](docs/architecture.md) for the architecture baseline and public module boundary proposal.

## Current architecture

The package root exports each module as a namespace (`Sse`, `Datastar`, `Html`, `Jsx`, `Platform`, `Realtime`, `Client`) and also re-exports their named helpers for small examples.

- `src/sse.ts` — pure Datastar SSE event encoding: element patches, signal patches, signal removal, script execution, and event stream concatenation.
- `src/datastar.ts` — typed Datastar expressions, signal references, fetch actions, modifiers, attribute helpers, merge helpers, and signal-name validation.
- `src/html.ts` — tiny HTML node builder/renderer plus full document helper.
- `src/jsx.ts` — experimental classic JSX factory that renders through the same HTML node model.
- `src/platform.ts` — Effect Platform HTTP integration: route composition, Datastar request detection, signal/query decoding with Effect Schema, HTML/SSE/direct response helpers.
- `src/realtime.ts` — optional Effect `PubSub`/`Stream` helpers, heartbeats, and live element patch responses.
- `src/client.ts` — Datastar script/document helpers and Effect Platform routes for serving a pinned Datastar client asset.

## Layered model

`ts-star` is organized around four layers:

1. **Protocol layer** — Datastar wire format and response semantics (`Sse`, protocol-facing `Platform` helpers).
2. **View layer** — server-rendered HTML and Datastar attributes (`Html`, `Jsx`, `Datastar`, `Client`).
3. **Runtime layer** — Effect request decoding, responses, scopes, streams, and realtime resources (`Platform`, `Realtime`).
4. **Programming model layer** — future pages, actions, and live queries that guide apps toward backend-source-of-truth flows.

The first three layers exist today. The fourth is the roadmap direction.

## Minimal counter

```ts
import * as Effect from "effect/Effect"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"
import * as HttpRouter from "effect/unstable/http/HttpRouter"
import * as HttpServerRequest from "effect/unstable/http/HttpServerRequest"
import * as HttpServerResponse from "effect/unstable/http/HttpServerResponse"
import {
  datastarDocument,
  dataSignals,
  h,
  mergeAttrs,
  on,
  platformHtmlResponse,
  platformPatchSignalsResponse,
  platformReadSignals,
  platformRouter,
  post,
  render,
  signal,
  text
} from "ts-star"

const CounterSignals = Schema.Struct({ count: Schema.Number })

const counterNode = () => {
  const count = signal<number, "count">("count")

  return h(
    "main",
    mergeAttrs({ id: "counter" }, dataSignals({ count: 0 }, { ifMissing: true })),
    h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
    h("output", text(count), "0")
  )
}

const page = () => platformHtmlResponse(datastarDocument(counterNode()))

const increment: Effect.Effect<
  HttpServerResponse.HttpServerResponse,
  never,
  HttpServerRequest.HttpServerRequest
> = Effect.gen(function* () {
  const decoded = yield* Effect.result(platformReadSignals(CounterSignals))

  if (Result.isFailure(decoded)) {
    return HttpServerResponse.text("Bad signals", { status: 400 })
  }

  return platformPatchSignalsResponse({ count: decoded.success.count + 1 })
})

export const app = platformRouter(
  HttpRouter.route("GET", "/", page()),
  HttpRouter.route("POST", "/increment", increment)
)
```

See `examples/counter.ts` for the smallest full-page Effect Platform signal patch flow, `examples/tsx-counter.tsx` for the same style of counter written with TSX, `examples/search.ts` for query decoding and direct HTML patch responses, and `examples/live-counter.ts` for PubSub-backed SSE patches.

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
