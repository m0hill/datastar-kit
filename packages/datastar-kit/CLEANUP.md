# datastar-kit cleanup log

## 2026-06-06

- Simplified request signal parsing: `read.signals()` now validates only the Datastar protocol boundary (valid JSON plus a top-level object) and leaves domain/schema validation to callers.
- Centralized Datastar attribute metadata so HTML rendering and JSX prop cleaning no longer duplicate presence/expression/modifier-target rules.
- Derived modifier casing and keys from the option type, and replaced the hand-written modifier compatibility branch chain with a table checked against `DatastarModifierOptions`.
- Replaced empty option-extension interfaces with direct type aliases and removed a couple of cleanup-time casts from internal metadata.
- Moved Datastar modifier suffix rendering out of the JSX runtime so JSX prop cleaning only handles JSX/HTML concerns.
- Tightened a couple of derived helper types (`fetchOptionKeys` and state signal objects) so future changes are checked against their source types.
