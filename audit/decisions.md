# Decisions

## D-001: Audit the implemented official-example package, not every current site example

- Decision: Treat `examples/hono-official-examples` as the target set for this goal.
- Reasoning: The user asked for official Datastar examples "as implemented in this SDK." The live Datastar site now includes additional entries not present in this package. Adding new examples is a different Module with different risk and review shape.
- Rejected alternative: Add Match Media, Templ Counter, and Rocket examples during this audit. That would mix catalog expansion with Interface cleanup and make commits less atomic.

## D-002: Keep browser plugin attributes in the SDK, not in each example

- Decision: Keep `ds.pluginAttr(name, value?)` as an SDK Interface.
- Reasoning: App-defined Datastar attribute plugins are a real Datastar extension point. Without this Interface, every caller must know the raw `data-*` spelling and the expression serialization rule.
- Rejected alternative: Tell examples to use raw `data-alert` and `data-focus-when`. That fails the deletion test because the same serialization complexity reappears at call sites.

## D-003: Do not add a generic loading/disabled helper to the SDK

- Decision: Leave pending-state conventions as app code for now.
- Reasoning: A helper that combines `data-indicator` and `data-attr:disabled` would hide a common pattern, but it would also choose signal names, element semantics, and accessibility behaviour. Existing tests document that validation and loading conventions stay outside the core SDK.
- Rejected alternative: Add `ds.pending(...)` or extend `ds.indicator(...)` with disabled behaviour. That would turn one app convention into an SDK Interface without enough variants.

## D-004: Move sizeable DOM scripts into browser modules

- Decision: Use public JavaScript modules for browser-only example code.
- Reasoning: Inline `unsafeHtml(...)` is appropriate for trusted HTML boundaries, not as the main authoring surface for DOM-heavy scripts. A script module is a better Seam: TSX owns markup, browser modules own browser APIs.
- Rejected alternative: Add an SDK script-builder DSL. That would reinvent JavaScript instead of using the platform.
