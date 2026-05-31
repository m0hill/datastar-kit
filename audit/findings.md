# Findings

## F-001: Custom plugin attributes forced raw `data-*` props

- Area: SDK `ds` attributes, official custom plugin example, custom actions example.
- Problem: App-defined Datastar attribute plugins such as `data-alert` and `data-focus-when` had no SDK Interface, so examples either wrote raw attributes or manually called `toDatastarExpression()`.
- Resolution: Keep the existing worktree direction: expose `ds.pluginAttr(name, value?)`, validate safe plugin names, serialize values through the same expression path as first-party attributes, and update examples/docs to use it.
- Leverage: Callers get one small Interface for any app plugin attribute instead of knowing raw HTML attribute spelling and expression serialization.
- Locality: Plugin attribute name validation and serialization live in one SDK Module.
- Status: Existing dirty worktree change reviewed; tests still need to be run and committed.

## F-002: Implemented example scope differs from the current official site catalog

- Area: `examples/hono-official-examples`.
- Problem: The current Datastar examples page lists newer entries such as Match Media, Templ Counter, and Rocket examples that this SDK package does not implement.
- Resolution: Audit the SDK's implemented official-example package in this pass. Do not add new examples during a refactor pass unless a later change explicitly targets catalog coverage.
- Leverage: The audit stays focused on improving existing Interfaces instead of becoming a feature-import project.
- Locality: Catalog drift is recorded here so future work can choose a separate example parity change.
- Status: Recorded as a boundary decision.

## F-003: Browser-only scripts are embedded as unsafe inline TSX strings

- Area: `custom-event.tsx`, `sortable.tsx`, `web-component.tsx`.
- Problem: Browser-only behaviour with DOM APIs is embedded in TSX through `unsafeHtml(...)`, making formatting, syntax checking, and reuse weaker. In Custom Event, the head script also ran before the target element existed.
- Resolution: Moved each browser script into a public module and included it through `pageHead(<script type="module" ...>)`.
- Leverage: The TSX Interface describes markup and Datastar wiring; browser code gets normal JavaScript module ergonomics.
- Locality: DOM API behaviour moves out of server-rendered views into files the browser owns.
- Status: Fixed in working tree; official example typecheck passed.

## F-004: Repeated pending-state attributes add boilerplate in official examples

- Area: Many official examples using `data-indicator` plus disabled attributes.
- Problem: Buttons often repeat `ds.indicator("_fetching")` and `ds.dataAttr("disabled", ds.expr("$_fetching"))`.
- Resolution: Do not add a core SDK helper yet. The SDK docs and tests deliberately keep loading conventions in app code; this repetition is visible but not enough to justify a new SDK Interface.
- Leverage: Callers retain direct Datastar vocabulary.
- Locality: Loading policy stays in each app where signal naming and accessibility choices differ.
- Status: Ruled out for core changes.

## F-005: Official examples bypassed signal refs inside Datastar expressions

- Area: Official example TSX under `examples/hono-official-examples/src/examples`.
- Problem: Many examples wrote raw signal names and action calls inside `ds.expr("...")`, so renaming a signal or route required editing string internals.
- Resolution: Rewrote official example expressions to use existing `ds.signal(...)`, `ds.local(...)`, `ds.state(...).$`, action helpers, and tagged `ds.expr` templates. Also corrected Bulk Update's unused `fetching` default to the actual `_fetching` signal used by `data-indicator`.
- Leverage: Callers keep writing Datastar expressions, but signal names and action serialization now come from the same small Interfaces used elsewhere.
- Locality: Signal naming mistakes concentrate in signal definitions instead of being duplicated through expression strings.
- Status: Fixed in working tree; official example typecheck passed.

## F-006: Keyed plugin attributes were ruled out for normal Datastar scope

- Area: SDK `ds.pluginAttr`.
- Problem: Keyed plugin support was considered because Match Media uses `data-match-media:is-dark`, but Match Media is Datastar Pro.
- Resolution: Removed keyed plugin attribute support and Pro-specific docs/tests from this audit.
- Leverage: Normal Datastar callers get the app plugin attribute helper already justified by custom examples without importing Pro-only surface.
- Locality: Pro catalog concerns stay out of the normal Datastar SDK.
- Status: Removed after user correction.

## F-007: Counter example source link pointed at the examples root

- Area: Official examples navigation and counter example layout.
- Problem: The local JSX counter port linked its source badge to the examples root instead of the official counter example path.
- Resolution: Kept the local Counter/Counters naming because this is not a Go Templ implementation, and linked the source badge to `/examples/templ_counter`.
- Leverage: Readers can move from the SDK port to the exact official example.
- Locality: Example catalog metadata stays in the official examples app.
- Status: Fixed in working tree.

## F-008: Counter example bypassed default response helpers

- Area: `counters.tsx`.
- Problem: The global counter returned a hand-written `204` and the user counter used `reply.directHtml(...)` even though normal Datastar SSE helpers were enough.
- Resolution: Replaced the raw response with `reply.done()` and the direct HTML response with `reply.patch(...)` while preserving the cookie header.
- Leverage: The example now teaches the default SDK command and patch Interfaces.
- Locality: Direct-response handling stays reserved for examples that actually need that protocol path.
- Status: Fixed in working tree.

## F-009: Durable Object todo rows used the public Todo type as the SQL row type

- Area: `examples/worker-do-hono-live-todos/src/realtime/hub.ts`.
- Problem: The SQL cursor row type intersected `SqlStorageValue` records with the public `Todo` type, making `completed` look boolean while the database returns `0 | 1` numbers and making timestamps too wide.
- Resolution: Added an explicit `TodoRow` Interface for database rows and kept the public `Todo` Interface as the rendered application shape.
- Leverage: The example keeps SQL transport details out of caller-facing todo data.
- Locality: Database row coercion lives at the Durable Object read boundary.
- Status: Fixed in working tree.

## F-010: HTML name serialization trusted caller-provided names

- Area: SDK HTML renderer, root exports, website security/API docs.
- Problem: `renderToString(...)` escaped text and attribute values, but tag names and rendered attribute names crossed the HTML boundary verbatim.
- Resolution: Added `HtmlNameError`, validated tag names at `h(...)` and render time, and validated emitted attribute names before serialization.
- Leverage: Callers keep the same tiny HTML Interface while the renderer owns a larger part of the serialization safety boundary.
- Locality: Name validation now lives in the HTML Module instead of being every caller's responsibility.
- Status: Fixed and verified with focused SDK test/typecheck runs.
