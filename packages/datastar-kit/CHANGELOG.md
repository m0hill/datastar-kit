# Changelog

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
