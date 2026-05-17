# Autoresearch: Effect + Datastar TypeScript prototype

## Objective

Prototype the smallest coherent `ts-star` vertical slice for a backend-driven Datastar framework in TypeScript on Node.js, using Effect idioms where they clarify boundaries. This is a capability-building research loop, not a performance benchmark.

The first useful slice should prove:

1. Datastar SSE events can be generated exactly enough to match the included SDK golden fixtures.
2. HTML can be rendered from TypeScript with typed Datastar attributes/actions.
3. Incoming Datastar signals can be decoded with Effect Schema.
4. An Effect handler can return HTML/SSE responses for a tiny interaction.

## Metrics

- **Primary**: `prototype_score` (unitless, higher is better) — number of passing prototype test cases after typecheck/test pass.
- **Secondary**: `tests`, `ts_files` — breadth monitors only.

## How to Run

`./autoresearch.sh` — typechecks/tests when code exists and outputs `METRIC name=value` lines.

## Files in Scope

- `package.json` — package scripts/dependencies for the TypeScript prototype.
- `tsconfig.json` / `vitest.config.ts` — TypeScript and test configuration.
- `src/**` — framework prototype code.
- `test/**` — capability tests and golden fixture checks.
- `examples/**` — minimal examples if useful for the vertical slice.
- `autoresearch.md`, `autoresearch.sh`, `autoresearch.ideas.md` — research loop state.

Reference-only material outside `ts-star`:

- `../data-star.dev_*.md` — Datastar docs and recommended patterns.
- `../datastar`, `../datastar.js` — Datastar client/repo and SDK fixtures.
- `../effect` — Effect examples/APIs.
- `../starHTML`, `../stario`, `../hyperlith`, `../datastar.wow`, `../Falco.Datastar`, `../stube`, `../northstar` — related framework ideas.

## Off Limits

- Do not modify the copied reference repositories or root Datastar docs.
- Do not edit `../datastar.js`; serve/reference it later if needed.
- Do not add plugin systems, adapters for every Node framework, databases, auth, or broad routing abstractions yet.

## Constraints

- Package manager: pnpm.
- Runtime target: Node.js.
- Use Datastar wire semantics from included docs/fixtures.
- Use Effect where it helps (Schema decoding, Effectful handlers, typed errors), not as ceremony.
- Keep abstractions minimal and reversible.
- Prefer tests that exercise real serialization/decoding over mocks.

## Study Notes

### Datastar core architecture

- Backend is the source of truth; frontend signals are for user interaction and request payloads.
- Server drives UI by patching elements/signals over SSE. `text/event-stream` should be the default response shape for Datastar actions.
- Morphing/fat patches are encouraged; do not over-optimize deltas early.
- Signals are sent on requests: GET/DELETE via `datastar` query param, other methods as JSON body.
- `data-on:*` expressions call actions like `@get`, `@post`, etc.; actions stream Datastar SSE events.

### Strong ideas to borrow

- **Hyperlith**: explicit CQRS/read stream pattern, fat morph to a stable root, signals only for ephemeral/client input, action handlers mutate backend state and usually do not patch view directly.
- **Stario**: small `Writer`/SSE helpers, explicit handlers, simple in-process `Relay` for realtime fanout, HTML/SSE stays visible in app code.
- **StarHTML**: expression DSL for typed signals/actions, automatic data attribute normalization, FOUC prevention for `data-show`, pragmatic helpers like `match`, `switch`, `collect`.
- **Falco.Datastar**: self-documenting typed Datastar attributes/actions without over-abstracting; typed request options and response helpers.
- **datastar.wow**: responses as data/effects is useful, but a generic effect registry is too much for the first TypeScript slice.
- **stube**: components/conversations as values are interesting but should be deferred; too much architecture for the first slice.

## Proposed Initial Architecture

1. `sse.ts`: pure Datastar event encoder returning strings/bytes. Cover `patchElements`, `patchSignals`, `removeElements`, and maybe `executeScript` later.
2. `signals.ts`: typed signal references and expression/action builders. Start with simple string-generating primitives; make invalid signal names hard to write.
3. `html.ts`: tiny HTML node builder and renderer. Support attributes as `Record<string, unknown>` and Datastar helpers as attr fragments.
4. `request.ts`: `readSignals(request, schema)` using Effect Schema. Accept Web `Request` first because it is native in Node 24 and easy to test.
5. `handler.ts`: define `Handler<A>` as `Effect.Effect<ResponseLike, E, R>` or a light wrapper; defer full router.

## Major Tradeoffs / Unknowns

- JSX may be more ergonomic, but a builder is easier to type and test while exploring Datastar-specific semantics.
- Full type-safe Datastar expressions are likely a project of their own. First target: typed signal names/values and safe action strings.
- Official TypeScript Datastar SDK exists. For this framework prototype, implement the tiny wire subset directly to understand semantics; decide later whether to wrap the official SDK.
- CQRS/read-stream should be an explicit pattern, not a mandatory framework shape yet.

## Minimal Prototype Scope

- Passing tests for SSE golden outputs from `../datastar/sdk/test/get-cases`.
- Render a counter UI with Datastar attributes:
  - initial `count` signal
  - button with `data-on:click="@post('/increment')"`
  - text bound with `data-text="$count"`
- Decode `{ count: number }` with Effect Schema from a POST request.
- Build an SSE response that patches `{ count: count + 1 }`.

## What's Been Tried

- Baseline: no implementation yet; score should be 0.
- Attempted first vertical slice with SSE encoder, HTML builder, typed signal/action helpers, Effect Schema request decoding, and counter tests. One test failed because a reactive `data-attr:disabled="false"` expression is intentionally a string attribute, not a false boolean HTML attr. Reapplied the slice without that misleading fixture attribute.
- Kept minimal vertical slice at score 18. Next iteration extends confidence against included SDK fixtures and adds compile-time signal misuse checks.
- Kept SDK fixture/type-safety expansion at score 23. Learned execute-script has special `mode append` then `selector body` line ordering; remove-signals is a patch-signals event with `null` leaves.
- Current iteration explores the thinnest possible Effect handler/router layer: exact routes, `withSignals`, and Web `Request`/`Response` only. Avoiding params/middleware for now.
- Kept thin handler/router layer at score 28 after fixing typecheck issues (`RouteMethod` name and direct `Headers` use). Next iteration adds Node runtime adapter so the same handler can run under `node:http`.
- Kept Node adapter at score 33. Real `node:http` + `fetch` tests validate Web Request/Response conversion, POST Datastar signal body decoding, 404s, and error handling. Next iteration explores optional realtime/CQRS primitives without making them framework-wide.
- Kept realtime helpers at score 38. In-process `Broadcaster` + AsyncIterable SSE mapping proves optional CQRS/live-update shape without a sync engine. Next iteration adds README/example to clarify the discovered architecture.
- Kept README/counter example at score 42. Current iteration tests a reversible classic JSX factory over the existing HTML node model instead of committing to JSX as the primary template API.
- Discarded earlier JSX attempts: first two failed typecheck around JSX children/Fragment/narrowing, third passed tests but benchmark ignored `.tsx` tests so primary metric was unchanged. Current iteration fixes the benchmark to count `.test.tsx`/`.spec.tsx` as prototype tests and reattempts the now-working JSX factory.
- Kept JSX factory + TSX metric fix at score 45. Next iteration improves Datastar DX with typed modifier builders for `data-on`, `data-on-intersect`, `data-on-interval`, and `data-on-signal-patch`, matching documented suffix syntax like `__debounce.500ms.leading`.
- Kept modifier helper iteration at score 51. Next iteration adds runtime validation for signal names/paths and `dataSignals` keys to make malformed Datastar interactions fail early.
- Kept signal validation at score 57. Next iteration adds Datastar client asset helpers to make self-hosting `datastar.js` explicit and testable, matching the project note that this script is sent to the browser/client.
- Kept Datastar client asset helpers at score 62. Next iteration adds direct Datastar action response helpers for `text/html`, `application/json`, and `text/javascript`, because Datastar supports these in addition to SSE streams.
- Kept direct response helpers at score 66. Next iteration hardens request edge cases and adds `isDatastarRequest` for the documented `Datastar-Request: true` header.
- Kept request edge-case hardening at score 71. Next iteration adds query parameter decoding with Effect Schema; route params are intentionally deferred to avoid router complexity.
- Kept query decoding at score 76. Next iteration adds route composition helpers (`prefixRoutes`, `concatRoutes`) rather than path params, preserving the exact-route model while improving app assembly.
- Kept route prefixing at score 78. `concatRoutes` was discarded because it widened route types to `any`; route groups can be spread directly. Next iteration adds strict attribute merging for cases where silent overrides would hide Datastar attr collisions.
- Kept strict attribute merge at score 82. Next iteration adds small expression combinators (`not`, `and`, `or`, `ternary`) to reduce raw JavaScript strings while keeping the expression DSL minimal.
- Kept expression combinators at score 87. Next iteration adds a fuller search example combining dynamic Datastar action URLs, query decoding, and direct HTML patch responses.
- Kept search example at score 92. Next iteration replaces raw template literal URLs with a small `queryUrl` helper for encoded dynamic Datastar action URLs.
- Kept `queryUrl` at score 96. Next iteration adds a live counter example using `Broadcaster` and `liveElementsResponse` to validate realtime composition in an example without introducing a sync engine.
- Kept live counter example at score 100. It exposed a public index problem: `export * as Handler` collided with the exported `Handler` type. Next iteration renames the namespace export to `Handlers` and verifies type import from the package root.
- Kept index export cleanup at score 102. Next iteration adds `mapErrorResponse` so typed Effect handler failures (especially signal decode errors) can become explicit HTTP responses.
- Kept handler error mapping at score 105. Next iteration adds an explicit `emptyResponse` helper for command endpoints returning 204/202, replacing ad-hoc `new Response(null, {status: 204})` in the live example.
- Kept `emptyResponse` at score 107. Next iteration adds object-form `dataAttrs`/`dataClasses` helpers for multiple Datastar bindings, especially class names with Tailwind-style special characters.
- Kept object-form attrs/classes at score 110. Next iteration adds `dataStyle`/`dataStyles` helpers to cover Datastar's style binding family with the same single-key/object-form pattern.
- Kept data-style helper family at score 112. Next iteration fills a gap around `data-on-signal-patch-filter`, composing it with existing signal patch listeners.
- Kept signal patch filter helper at score 114. Next iteration covers a few remaining low-level Datastar attributes (`data-ref`, `data-json-signals`, `data-preserve-attr`) without adding new architecture.
- Kept ref/jsonSignals/preserveAttr helpers at score 118. Next iteration adds tiny `data-ignore`/`data-ignore-morph` helpers, then should probably stop expanding the attribute surface and focus on docs/examples.
- Kept ignore helpers at score 121. Next iteration improves response DX by allowing `htmlResponse` and `htmlPatchResponse` to accept rendered HTML nodes, reducing manual `render(...)` calls in app code.
- Kept HTML node response rendering at score 124. Next iteration adds `htmlDocument` to avoid hand-written doctypes/full-page strings in examples.
- Kept `htmlDocument` at score 126. Next iteration adds a small `serve` helper for `node:http` so prototypes/examples can run without hand-writing server bootstrap every time.
- Kept Node serve helper at score 128. Next iteration adds a scoped server helper with `Effect.acquireRelease` for idiomatic lifecycle management in tests/apps.
- Kept scoped Node server helper at score 129. Next iteration updates examples to return full Datastar HTML documents using `htmlDocument`/`datastarScript`, improving runability now that server lifecycle helpers exist.
- Kept full-document examples at score 130. Next iteration lets SSE `patchElementsResponse` accept HTML nodes like direct HTML responses, reducing manual `render(...)` calls for streamed patches.
- Kept SSE patch element node rendering at score 131. Next iteration factors the repeated `htmlResponse(htmlDocument({ head: datastarScript(), body }))` pattern into Datastar document/page helpers, keeping examples runnable without ceremony.
- Kept Datastar document/page helpers at score 133. Next iteration updates the live counter patch fragment to return an HTML node directly, proving realtime SSE rendering can stay node-based end-to-end.
- Kept live counter node-based patches at score 134. Next iteration adds an explicit helper to pair exact app routes with a default `/datastar.js` client asset route, avoiding hidden asset serving while keeping runnable prototypes small.
