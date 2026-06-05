# datastar-kit cleanup log

## 2026-06-06

- Simplified request signal parsing: `read.signals()` now validates only the Datastar protocol boundary (valid JSON plus a top-level object) and leaves domain/schema validation to callers.
- Centralized Datastar attribute metadata so HTML rendering and JSX prop cleaning no longer duplicate presence/expression/modifier-target rules.
- Derived modifier casing and keys from the option type, and replaced the hand-written modifier compatibility branch chain with a table checked against `DatastarModifierOptions`.
- Replaced empty option-extension interfaces with direct type aliases and removed a couple of cleanup-time casts from internal metadata.
- Moved Datastar modifier suffix rendering out of the JSX runtime so JSX prop cleaning only handles JSX/HTML concerns.
- Tightened a couple of derived helper types (`fetchOptionKeys` and state signal objects) so future changes are checked against their source types.
- Removed the `delete` export alias for the `del(...)` action helper because `delete` is a JavaScript keyword and consumers could only import it by aliasing it again (`import { delete as ... }`). `del(...)` remains the single readable helper for Datastar `@delete(...)` actions.
- Removed `reply.PatchOptions` and `reply.SignalsOptions` aliases because they only renamed `PatchElementsOptions` and `PatchSignalsOptions` without changing behavior; `reply.patch(...)` and `reply.signals(...)` now use the SSE option types directly.
