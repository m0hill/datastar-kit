# datastar-kit cleanup log

## 2026-06-06

- Simplified request signal parsing: `read.signals()` now validates only the Datastar protocol boundary (valid JSON plus a top-level object) and leaves domain/schema validation to callers.
