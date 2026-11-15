# Changelog

## Unreleased

### Added

- Added `read.flattenIssues(issues)`, which groups Standard Schema issues from any validator into `{ form, fields }`: messages with no path under `form`, and the rest keyed by dot path, such as `"address.city"`. The shape matches Zod's `flattenError`.

- `reply.stream(...)` accepts a function that builds the event source from an `AbortSignal`. The signal aborts when the client disconnects, on every runtime, so a generator waiting for its next event can stop instead of waiting forever.

### Fixed

- When a client disconnects from `reply.stream(...)` while the source is waiting for its next event, a custom async iterator's `return()` is now called right away. Before, it ran only after the next event arrived, so a quiet subscription could stay open indefinitely.

## 0.7.0 - 2026-11-14

### Added

- Added `computed<T>(name)`, a read-only ref to a signal defined with `data-computed:<name>`. It reads like any signal in `data-text`, `data-show`, and `js` expressions, but `data-bind`, `data-indicator`, and `data-ref` reject it: Datastar ignores writes to a computed signal, so a bound input would silently stop updating it. Its type is exported as `Computed`.
- Typed `<template>` attributes for declarative shadow DOM (`shadowrootmode`, `shadowrootclonable`, `shadowrootdelegatesfocus`, `shadowrootserializable`, `shadowrootcustomelementregistry`, `shadowrootslotassignment`), `webkitdirectory` on file inputs, and `credentialless` on iframes.
- Elements accept React-style names for multi-word attributes, such as `maxLength`, `readOnly`, `tabIndex`, `autoComplete`, and `colSpan`, alongside `className` and `htmlFor`. Each alias renders as its HTML attribute and is accepted only on elements that have that attribute. When both names are written, the HTML name wins.
- Added first-class function views: `h.<tag>(props, ...children)` for every HTML and SVG tag, `h(Component, props, ...children)` for components, and `h("my-element", props, ...children)` for custom elements and dynamic tags. `h()` and JSX share one element core, so props are typed by the same element types (including `CustomJsxAttributes` and `CustomJsxElements` registrations) and render identical HTML. Because props are object literals, `h()` also rejects misspelled attributes that JSX accepts. `Fragment`, `ElementFactory`, `ElementTagFunctions`, and `IntrinsicElementProps` are exported from the root.
- Exported `HtmlNameError` from the root and `SseFieldError` from `event` and `reply`, so callers can catch the errors these helpers throw with `instanceof`.
- Added `query(url, options?)`, which builds Datastar's `@query()` action for HTTP `QUERY` requests with signals in the request body. `read.signals(request)` already reads `QUERY` bodies. Requires Datastar 1.0.4.
- Added a `nonce` option to `reply.page(...)`. It renders `data-nonce` on `<html>`, which turns on Datastar's CSP mode so pages can run without `unsafe-eval`. Requires Datastar 1.0.3.

### Fixed

- Radio inputs and single selects accept `data-bind` signals typed as a union of their values, such as `signal<"light" | "dark">`. They write back one of the rendered values, so the signal no longer has to accept any string. Signals typed `string | number` still bind.
- Fixed JSX elements whose `key` comes after a spread, such as `<li {...props} key={id} />`, failing to load: TypeScript and esbuild compile them to `createElement` imported from `datastar-kit`, which the package now exports.
- `debounce` and `throttle` options no longer drop flags silently. Each accepts only its own flags (`leading`/`noTrailing` for debounce, `noLeading`/`trailing` for throttle), in the types and at runtime. `TimingModifierOptions` is now the union of the new `DebounceModifierOptions` and `ThrottleModifierOptions`.
- An SSE `retry` that is not a non-negative whole number of milliseconds now throws `SseFieldError` instead of writing a line `EventSource` ignores.
- `js` and the other expression helpers now throw a `TypeError` for functions and symbols instead of rendering them as strings, and render bigints as bigint literals (`10n`).
- A malformed or non-HTTP(S) entry in `allowedOrigins` now throws a `TypeError` naming it, instead of never matching.
- `readEvents` reads a field line without a colon as a field with an empty value, as the SSE spec does, and reports invalid signal JSON as a `DatastarEventError`.

### Changed

- `h(tag, props, ...children)` now type-checks props against the element's attributes and normalizes Datastar values like JSX does. Before, it took only primitive props and rendered `mod(...)` and objects as `[object Object]`, signal refs in `data-bind` as `$name`, and `className` as a literal attribute. Arbitrary `data-*` props now go through `...dataAttrs({...})`, as in JSX.
- Documented support for every Datastar `1.0.x` release, from `1.0.0` to `1.0.5`, with the minimum Datastar version for each feature that needs a newer runtime. The browser tests now run against every Datastar release from 1.0.0 to 1.0.5.
- Examples and docs now load Datastar `v1.0.5`.
- `reply.navigate(...)` now sends its navigation script as an SSE event instead of a `text/javascript` response, so every Datastar action reply is SSE. Calls stay the same. `NavigateOptions` is now the same type as `event.NavigateOptions`.

### Removed

- `true` no longer renders as a bare attribute for obsolete HTML boolean attributes (`compact`, `declare`, `nohref`, `noresize`, `nowrap`, `scoped`, `truespeed`, `typemustmatch`, `allowpaymentrequest`). No element type accepts them.
- Removed the deprecated `DatastarExpression` and `DatastarExpressionValue` types. Use the semantic expression type for the attribute instead: `DatastarReadableExpression`, `DatastarTruthyExpression`, or `DatastarEffectExpression`.
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

- Removed the `datastar-kit/debugger` subpath and its Web Component. The debugger is no longer part of Datastar Kit.

## 0.5.0 - 2026-07-25

### Added

- Added `dataAttrs(...)` for type-safe primitive custom dataset spreads and `CustomJsxAttributes`/`CustomJsxElements` module-augmentation seams for exact custom attributes and elements.
- Added a browser-installed debugger Web Component with timeline snapshots for restoring earlier page HTML and browser signal state during development.

### Removed

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
