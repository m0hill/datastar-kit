# Decisions

## D-001: Audit the whole repo, not only the official-example package

- Decision: Treat the SDK package, website, docs, and all examples as the target set for this goal.
- Reasoning: The official Datastar examples exposed several Interface issues first, but the same depth, leverage, and locality standards apply across the repository.
- Rejected alternative: Stop after `examples/hono-official-examples`. That would leave SDK and non-official example seams unaudited.

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

## D-005: Use existing expression interpolation before adding an expression DSL

- Decision: Replace raw expression strings in examples with tagged `ds.expr` templates and signal/action refs.
- Reasoning: The SDK already has a Datastar expression Interface that serializes refs and literals. Using it gives leverage without hiding Datastar's expression language.
- Rejected alternative: Add builders such as `assign(...)`, `when(...)`, or `onKey(...)`. That would create a second expression language and fail the guardrail against abstraction towers.

## D-006: Exclude Datastar Pro examples and plugin attributes

- Decision: Do not add support or docs driven only by Datastar Pro examples.
- Reasoning: This SDK targets normal Datastar. Match Media and Rocket examples are Pro catalog entries and should not shape the normal SDK Interface in this audit.
- Rejected alternative: Keep keyed `pluginAttr(...)` support because it is syntactically possible. That lacks a normal Datastar example to justify the wider Interface.

## D-007: Validate HTML names inside the renderer

- Decision: Make the HTML Module reject unsafe tag and emitted attribute names.
- Reasoning: Escaping values is not enough when names are part of the serialized output. The renderer is the right Seam because every TSX and `h(...)` caller passes through it.
- Rejected alternative: Document that callers must sanitize names themselves. That fails the deletion test because every dynamic wrapper would need to repeat the same boundary check.

## D-008: Render regex expressions with `new RegExp(...)`

- Decision: Make `ds.regex(pattern, flags)` emit a constructor expression instead of a slash-delimited literal.
- Reasoning: `pattern` and `flags` match the native `RegExp` constructor Interface. Rendering the same shape avoids a second escaping rule for Datastar expression output.
- Rejected alternative: Keep regex literals and document slash escaping. That fails the deletion test because the escaping rule reappears at every dynamic filter call site.

## D-009: Keep live room helpers local to examples

- Decision: Centralize repeated room lookup in the Worker example, but do not add a generic live-room SDK Module.
- Reasoning: The room helper earns locality inside one app because the room name is a boundary. A shared SDK live-room abstraction would pick platform semantics Datastar Kit intentionally leaves to the host app.
- Rejected alternative: Add `reply.liveRoom(...)` or a reusable realtime bus to the SDK. That would turn example infrastructure into core API without enough variants.
