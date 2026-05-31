# Changelog

1. `d46f524 feat: data attr`
   - Added the audit ledger.
   - Added `ds.pluginAttr(name, value?)` for app-defined Datastar plugin attributes.
   - Updated custom plugin/action examples, docs, and tests to use the new Interface.

2. `Move official browser scripts into modules`
   - Moved Custom Event, Sortable, and Web Component browser code out of inline `unsafeHtml(...)`.
   - Added public module files served by the official examples app.
   - Verified with `pnpm --filter @datastar-kit/example-hono-official-examples typecheck`.

3. `Use signal refs in official expressions`
   - Replaced raw `ds.expr("...")` signal/action strings in official example TSX with tagged `ds.expr` templates and typed refs.
   - Corrected Bulk Update's loading state from unused `fetching` to the `_fetching` signal consumed by `data-indicator`.
   - Verified with `pnpm --filter @datastar-kit/example-hono-official-examples typecheck`.
