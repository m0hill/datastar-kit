# Audit Changelog

1. `audit: initialize SDK audit` - Created the audit files and recorded initial SDK findings from source, docs, tests, and examples.
2. `feat: accept signal refs for signal attributes` - Let standalone signal refs initialize `data-signals` and `data-computed` without leaking `.name`.
3. `feat: add signal expression helpers` - Added `ds.set`, `ds.sequence`, and `ds.when` to absorb common inline JavaScript assignment and guard patterns.
4. `ref: remove stream chunk wrapper` - Removed the unused `reply.SseChunk` wrapper shape from `reply.stream(...)`.
5. `fix: preserve URL fragments in queryUrl` - Fixed generated query parameters so they render before URL fragments.
6. `fix: validate script event attribute names` - Reused the HTML renderer's attribute-name guard for script SSE events.
