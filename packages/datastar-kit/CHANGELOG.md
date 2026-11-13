# Changelog

## Unreleased

### Added

- Added `query(url, options?)`, which builds Datastar's `@query()` action for HTTP `QUERY` requests with signals in the request body. `read.signals(request)` already reads `QUERY` bodies. Requires Datastar 1.0.4.
- Added a `nonce` option to `reply.page(...)`. It renders `data-nonce` on `<html>`, which turns on Datastar's CSP mode so pages can run without `unsafe-eval`. Requires Datastar 1.0.3.

### Changed

- Documented support for every Datastar `1.0.x` release, from `1.0.0` to `1.0.4`, with the minimum Datastar version for each feature that needs a newer runtime. The browser tests now run against every Datastar release from 1.0.0 to 1.0.4.
- Examples and docs now load Datastar `v1.0.4`.
- `reply.navigate(...)` now sends its navigation script as an SSE event instead of a `text/javascript` response, so every Datastar action reply is SSE. Calls stay the same. `NavigateOptions` is now the same type as `event.NavigateOptions`.

### Removed

- Removed `reply.directHtml`, `reply.directSignals`, and `reply.directScript` and their option types. They sent the same updates as `reply.patch`, `reply.signals`, and `event.script` in a second, non-SSE format, and offered nothing the SSE replies lack: an SSE reply can opt into browser caching with a `Cache-Control` header in `init` just the same. Datastar's SDK spec and its official TypeScript SDK send only SSE as well.
- Removed the `datastar-kit/sse` subpath. It duplicated `event.*`: use `event.patch`, `event.signals`, `event.script`, and `event.comment` inside `reply.stream(...)`. For an HTML string from another template engine, pass `unsafeHtml(html)` to `event.patch`.

## 0.6.0 - 2026-10-18

### Added

- Added `read.validate(request, schema)`, which decodes Datastar signals and validates them with any [Standard Schema](https://standardschema.dev) validator (Zod, Valibot, ArkType, and others). It returns the schema result with a typed `value` or `issues` instead of throwing on validation failure.
- Added `reply.remove(selector)` and `event.remove(selector)` for removing elements. They require the selector that Datastar needs for remove patches, which `reply.patch("", { mode: "remove" })` could leave out.
- Added `readEvents(response, { count })` in the new `datastar-kit/testing` subpath. It decodes Datastar SSE responses into typed `patch-elements` and `patch-signals` events with defaults filled in, skips comments, and cancels long-lived streams after `count` events.

### Changed

- Narrowed whole-map expressions: `data-class` expression maps must produce booleans, and `data-attr` expression maps must produce JSON values instead of any object.
- Unregistered hyphenated custom elements now accept only props the JSX runtime can render, matching the runtime error for other values.
- `reply.stream(...)` accepts iterables and async iterables of chunks. Pass a single event as `[chunk]`. A `ReadableStream` still works where it is async-iterable (Workers, Node, Bun, Deno); its TypeScript type needs the `DOM.AsyncIterable` lib or the platform's types.
- Datastar expressions are recognized by class instead of by a `toDatastarExpression` method, so only expressions created by Datastar Kit helpers are treated as expressions.

### Removed

- Removed `reply.directHtml`, `reply.directSignals`, and `reply.directScript` and their option types. They sent the same updates as `reply.patch`, `reply.signals`, and `event.script` in a second, non-SSE format, and offered nothing the SSE replies lack: an SSE reply can opt into browser caching with a `Cache-Control` header in `init` just the same. Datastar's SDK spec and its official TypeScript SDK send only SSE as well.
- Removed the `datastar-kit/debugger` subpath and its Web Component. The debugger is no longer part of Datastar Kit.

## 0.5.0 - 2026-07-25

### Added

- Added `dataAttrs(...)` for type-safe primitive custom dataset spreads and `CustomJsxAttributes`/`CustomJsxElements` module-augmentation seams for exact custom attributes and elements.
- Added a browser-installed debugger Web Component with timeline snapshots for restoring earlier page HTML and browser signal state during development.

### Removed

- Removed `reply.directHtml`, `reply.directSignals`, and `reply.directScript` and their option types. They sent the same updates as `reply.patch`, `reply.signals`, and `event.script` in a second, non-SSE format, and offered nothing the SSE replies lack: an SSE reply can opt into browser caching with a `Cache-Control` header in `init` just the same. Datastar's SDK spec and its official TypeScript SDK send only SSE as well.
- Removed the server-rendered `DatastarDebugger` component. Load the development-only Web Component from `datastar-kit/debugger` instead.
- Removed `state(...).ref(path)` and its `StatePathError`/path helper types; use `state(...).refs` for known leaf refs or `Signal.path(...)` for dynamic child refs.

### Fixed

- Preserved `Expr<T>` and `Signal<T>` value types during assignment, preventing incompatible signals and expressions from being passed to typed helpers.
- Checked signal write types for mutating attributes: `data-indicator` requires a boolean-capable target, known-element `data-ref` values use the concrete DOM element type, and native `data-bind` adapters require readable and writable signals compatible with the input type or select multiplicity.
- Tightened JSX authoring so normal attribute typos and non-hyphenated unknown elements fail type checking, registered custom elements retain typed global attributes, input types use valid keywords, and `data-on:*` typed expressions must produce `void`.
- Separated Datastar JSX expressions by semantics: effect and lifecycle attributes require `Expr<void>`, text and dynamic attributes reject values their browser renderers cannot serialize, styles require CSS-compatible values, computed maps require callable leaves, static filters reject reactive expressions, and signal attributes require structured values.
- Constrained registered custom attributes and elements to renderer-safe values, and excluded modifier wrappers from custom data plugins without modifier metadata.
- Preserved repeated `Set-Cookie` headers when `reply.*` helpers merge default and caller-provided response headers.
- Rendered `executeScript(...)` script attributes with the shared HTML attribute serializer, including correct boolean attribute semantics.
- Avoided treating plain signal-state objects with a `toDatastarExpression` key as Datastar expression instances.

## 0.4.0 - 2026-06-15

### Added

- Exposed the low-level `h(tag, props, ...children)` hyperscript factory from the root package for building `HtmlNode`s without JSX.
- Added the `datastar-kit/debugger` subpath with a compact development-only `DatastarDebugger` TSX component for inspecting current signals and searchable Datastar event activity.
- Added `state(...).ref(path)` for typed refs to any known state path, including object-valued paths.
- Added `event.comment(...)` and `datastar-kit/sse` `comment(...)` for manual SSE heartbeat comments in streams.

### Fixed

- Render bare boolean HTML children as empty strings, so `true` no longer leaks visible text into serialized markup.
- Escaped `</script>` and `<!--` sequences in `executeScript(...)` SSE output to prevent script element breakout while preserving trusted JavaScript semantics.
- Rejected control characters in SSE `id`, `selector`, and `viewTransitionSelector` fields to prevent malformed or injected event stream lines.
- Aligned SSE event helpers with Datastar defaults by omitting `retry: 1000`, ignoring `viewTransitionSelector` unless `useViewTransition` is enabled, and allowing remove-mode element patches without an elements payload.
- Split multiline SSE data payloads on CRLF, bare CR, and bare LF while preserving legitimate multiline `elements` and `signals` payloads.
- Deep-froze exposed `state(...).defaults` so runtime mutation cannot change the reset baseline.
- Preserved explicit literal unions in `state(...)` patches while still widening singleton literal defaults.
- Allowed `null` in typed `state(...).patch(...)` and `state(...).reset(...)` overrides to remove signals through Datastar patch semantics.

## 0.3.0 - 2026-06-07

### Added

- Added typed serialization for native Datastar `data-*` attributes in TSX.
- Added `mod(value, modifiers)` for native Datastar attribute modifiers, such as `data-on:submit={mod(post("/signup"), { prevent: true })}`.
- Added concise named Datastar authoring imports from the root package.
- Added `RegexExpressionError` for invalid `regex(...)` patterns or flags.

### Changed

- `regex(pattern, flags?)` now renders `new RegExp(...)` expressions instead of slash-delimited literals, so callers can pass ordinary `RegExp` constructor inputs without managing literal escaping.
- `state(...)` now exposes `defaults` for direct `data-signals={mod(state.defaults, { ifMissing: true })}` usage instead of returning attribute prop fragments.
- `queryUrl(...)` now inserts generated query parameters before URL fragments and preserves open query separators.
- `executeScript(...)` now validates generated script attribute names with the same HTML name guard used by the renderer.

### Removed

- Removed `reply.directHtml`, `reply.directSignals`, and `reply.directScript` and their option types. They sent the same updates as `reply.patch`, `reply.signals`, and `event.script` in a second, non-SSE format, and offered nothing the SSE replies lack: an SSE reply can opt into browser caching with a `Cache-Control` header in `init` just the same. Datastar's SDK spec and its official TypeScript SDK send only SSE as well.
- Removed the root `ds` namespace export; import Datastar authoring helpers directly from `datastar-kit`.
- Removed the `expr(...)` public alias; use `js(...)` / `js\`...\``.
- Removed the Datastar attribute prop-fragment DSL: write native `data-*` Datastar attributes in TSX instead.
- Removed `state.attrs()`; use `data-signals={mod(state.defaults, { ifMissing: true })}`.
- Removed shallow expression aliases `sequence(...)`, `when(...)`, `peek(...)`, `setAll(...)`, and `toggleAll(...)`; use `js(...)` / `js\`...\``or`action(...)`.
- Removed public root exports for `h`, `mergeProps`, and `HtmlNameError`; TSX is the public HTML authoring path.
- Removed the unused `reply.SseChunk` wrapper shape from `reply.stream(...)`; stream chunks are now strings or `Uint8Array` values.
- Removed the awkward `delete` export alias for `del(...)`; use `del(...)` for Datastar `@delete(...)` actions.
- Removed the `state(...).$` alias; use the readable `state(...).refs` property for typed signal references.
- Removed `set(signal, value)`; write assignments with `js\`${signal} = ${value}\`` instead.

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
