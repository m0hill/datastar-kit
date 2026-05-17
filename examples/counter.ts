import * as Effect from "effect/Effect"
import * as Schema from "effect/Schema"
import {
  dataSignals,
  htmlResponse,
  h,
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
} from "../src/index.js"

export const CounterSignals = Schema.Struct({
  count: Schema.Number
})

export const counterView = (): string => {
  const count = signal<number, "count">("count")

  return render(
    h(
      "main",
      mergeAttrs({ id: "counter" }, dataSignals({ count: 0 }, { ifMissing: true })),
      h("h1", {}, "ts-star counter"),
      h("button", mergeAttrs({ type: "button" }, on("click", post("/increment"))), "+"),
      h("output", text(count), "0")
    )
  )
}

export const page = (): Response =>
  htmlResponse(`<!doctype html><html><head><script type="module" src="/datastar.js"></script></head><body>${counterView()}</body></html>`)

export const increment = withSignals(CounterSignals, (signals) =>
  Effect.succeed(patchSignalsResponse({ count: signals.count + 1 }))
)

export const app = router(
  route("GET", "/", () => Effect.succeed(page())),
  route("POST", "/increment", increment)
)
