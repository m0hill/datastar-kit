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
