# ts-star

Exploratory TypeScript + Effect + Datastar framework prototype.

This is intentionally small. The current shape favors explicit backend-driven HTML/SSE over a full frontend framework or a large server abstraction.

## Current architecture

- `src/sse.ts` — pure Datastar SSE event encoding (`patchElements`, `patchSignals`, `removeSignals`, `executeScript`). Tested against included Datastar SDK fixtures.
- `src/datastar.ts` — typed signal/action/attribute helpers for generating Datastar expressions, validating signal names, modifier suffixes, and `data-*` attributes.
- `src/html.ts` — tiny HTML builder/renderer used while templating choices are still open.
- `src/jsx.ts` — experimental classic JSX factory that renders through the same HTML nodes.
- `src/request.ts` — reads Datastar signals from Web `Request`s and decodes them with Effect Schema.
- `src/handler.ts` — plain Effect handlers returning Web `Response`s, plus exact-route dispatch and `withSignals`.
- `src/node.ts` — boundary adapter from `node:http` to Web `Request`/`Response`.
- `src/realtime.ts` — optional in-process broadcaster + AsyncIterable-to-SSE helpers for CQRS-style live updates.

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

## Open questions

- Should JSX remain a thin alternative over the builder, or should the builder stay the primary API?
- How far should the typed expression DSL go before it becomes its own language?
- Should CQRS/fat-morph live streams remain optional helpers or become a blessed app pattern?
