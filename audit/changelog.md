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

4. `Allow keyed plugin attributes`
   - Added keyed `ds.pluginAttr(...)` support based on Match Media.
   - Superseded by the next commit because Match Media is Datastar Pro and out of normal Datastar scope.

5. `Fix counter example source metadata`
   - Kept the local JSX port named Counters.
   - Linked the source badge to `https://data-star.dev/examples/templ_counter`.

6. `Drop pro-only keyed plugin support`
   - Removed keyed `pluginAttr(...)` support and Match Media docs/tests.
   - Recorded Datastar Pro examples as out of scope.

7. `Use default counter responses`
   - Replaced a raw `204` with `reply.done()`.
   - Replaced `reply.directHtml(...)` with `reply.patch(...)` while preserving the cookie header.

8. `Type Durable Object todo rows explicitly`
   - Split SQL row typing from the public todo shape in the Durable Object live todos example.
   - Fixed the workspace typecheck failure caused by `SqlStorageValue` row values.
