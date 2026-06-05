# Changelog

## Unreleased

### Added

- Added typed serialization for native Datastar `data-*` attributes in TSX.
- Added tuple modifier values for native Datastar attributes, such as `data-on:submit={[ds.post("/signup"), { prevent: true }]}`.
- Added `ds.RegexExpressionError` for invalid `ds.regex(...)` patterns or flags.
- Added `ds.set(...)` for typed Datastar signal assignment expressions.

### Changed

- `ds.regex(pattern, flags?)` now renders `new RegExp(...)` expressions instead of slash-delimited literals, so callers can pass ordinary `RegExp` constructor inputs without managing literal escaping.
- `ds.state(...)` now exposes `defaults` for direct `data-signals={[state.defaults, { ifMissing: true }]}` usage instead of returning attribute prop fragments.
- `ds.queryUrl(...)` now inserts generated query parameters before URL fragments and preserves open query separators.
- `executeScript(...)` now validates generated script attribute names with the same HTML name guard used by the renderer.

### Removed

- Removed the Datastar attribute prop-fragment DSL: write native `data-*` Datastar attributes in TSX instead.
- Removed `state.attrs()`; use `data-signals={[state.defaults, { ifMissing: true }]}`.
- Removed shallow expression aliases `ds.sequence(...)`, `ds.when(...)`, `ds.peek(...)`, `ds.setAll(...)`, and `ds.toggleAll(...)`; use `ds.expr(...)` or `ds.action(...)`.
- Removed public root exports for `h`, `mergeProps`, and `HtmlNameError`; TSX is the public HTML authoring path.
- Removed the unused `reply.SseChunk` wrapper shape from `reply.stream(...)`; stream chunks are now strings or `Uint8Array` values.

## 0.2.0 - 2026-05-27

### Added

- Added `event.navigate(url, options)` for safe browser navigation from Datastar SSE event streams.
- Exported `event.NavigationUrlError`, matching the existing `reply.NavigationUrlError` for rejected navigation targets.

### Changed

- `ds.bind()`, `ds.ref()`, and `ds.indicator()` now emit Datastar's value-form attributes by default, such as `data-bind="count"`, instead of keyed boolean attributes like `data-bind:count` when no case modifier is needed.
- `ds.dataSignal()` and `ds.dataComputed()` now preserve camelCase signal names by emitting Datastar-compatible kebab-case keyed attributes when safe, while falling back to object-valued `data-signals` or `data-computed` for names that cannot round-trip safely.
- Explicit `case` modifiers still use Datastar's native keyed syntax, preserving opt-in control over keyed attribute casing.

## 0.1.0 - 2026-05-22

- Initial public npm release of `datastar-kit`.
- Includes typed Datastar attribute/action/signal helpers, TSX/HTML rendering, signal readers, native `Response` helpers, and SSE event helpers.
