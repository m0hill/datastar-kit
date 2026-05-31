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

## F-006: `pluginAttr` rejected keyed plugin attributes

- Area: SDK `ds.pluginAttr`.
- Problem: Datastar plugin attributes can use keyed names such as `data-match-media:is-dark`, but the helper only accepted unkeyed kebab-case names.
- Resolution: Allowed one validated keyed suffix in `ds.pluginAttr(name, value?)`, preserving the existing single-string Interface.
- Leverage: Callers can render both unkeyed and keyed app plugin attributes without raw `data-*` props.
- Locality: The name grammar remains in the plugin attribute Module instead of leaking into example markup.
- Status: Fixed in working tree; SDK typecheck and tests passed.
