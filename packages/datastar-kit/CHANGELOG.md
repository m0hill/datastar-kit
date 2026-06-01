# Changelog

## Unreleased

### Added

- Added `ds.pluginAttr(name, value?)` for app-defined Datastar plugin attributes, including keyed plugin attributes.
- Added `HtmlNameError` when rendered HTML tag or attribute names cannot be serialized safely.
- Added `ds.RegexExpressionError` for invalid `ds.regex(...)` patterns or flags.
- Added `ds.set(...)`, `ds.sequence(...)`, and `ds.when(...)` for common Datastar signal mutation and guarded-action expressions.

### Changed

- `ds.regex(pattern, flags?)` now renders `new RegExp(...)` expressions instead of slash-delimited literals, so callers can pass ordinary `RegExp` constructor inputs without managing literal escaping.
- `ds.dataSignal(...)` and `ds.dataComputed(...)` now accept signal refs directly as well as signal-name strings.
- `ds.queryUrl(...)` now inserts generated query parameters before URL fragments and preserves open query separators.

### Removed

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
