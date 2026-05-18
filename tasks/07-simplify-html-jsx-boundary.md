# T007 — Define the tiny HTML boundary and explicit JSX adapter

## Status

`done`

## Grill level

`3/5` — design cleanup with decisions now settled.

## Settled decisions

1. `h(...)` remains the canonical HTML element builder.
2. `render(...)` remains the HTML string renderer.
3. `fragment(...)` remains the sibling/group helper.
4. `raw(...)` is the top-level raw HTML escape hatch.
5. `props(...)` is the one blessed HTML prop/attribute composition helper.
6. `page(...)` is the HTML document/page builder.
7. JSX/TSX stays available only as an explicit experimental adapter, not as part of the main framework identity.
8. JSX function components are allowed, but only as plain server render functions returning `Child`/`HtmlNode`. No hooks, lifecycle, context system, async component protocol, client components, or hydration semantics.
9. JSX should not be root-exported. Use a deliberate adapter/subpath such as `ts-star/jsx` once package subpaths are added.
10. Do not expose ordered-attribute APIs publicly. Rely on normal object insertion order and `props(...)`; revisit only if a real Datastar ordering bug requires it.
11. Remove public renderer adapter APIs for now. External renderers can pass already-rendered strings to `reply.page`, `reply.patch`, etc.
12. Remove public patchable-ID helpers. Document stable IDs/selectors instead.
13. Do not expose strict prop/attribute merging publicly.

## Naming notes

- `raw(...)` is raw HTML. `ds.raw(...)` remains the Datastar expression escape hatch. Docs must make this distinction clear.
- `props(...)` means HTML props/attributes. It is not a React-style component-props system.
- `page(...)` builds an HTML document/page string. `reply.page(...)` is the HTTP response helper that can use `page(...)` internally.

## Why this task exists

`src/html.ts` is a good small renderer, but it currently exposes implementation details and future-facing extension hooks. `src/jsx.ts` is useful syntax sugar, but JSX can invite React mental models if it appears central.

The framework should keep server-rendered HTML simple, explicit, and compatible with Datastar's server-driven identity.

## Target public HTML surface

Top-level public values:

- `h`
- `render`
- `fragment`
- `raw`
- `props`
- `page`

Public types:

- `Child`
- `HtmlNode`
- `Props`
- `PropValue`

Experimental JSX adapter, not root-public:

- `jsx`
- `Fragment`
- JSX-specific types needed by the adapter

## Replacement map

- `rawHtml(...)` -> `raw(...)`
- `mergeAttrs(...)` -> `props(...)`
- `htmlDocument(...)` -> `page(...)`
- `Attributes` -> `Props`
- `AttributeValue` -> `PropValue`

## Removal/internal candidates

- `Html` root namespace if the top-level primitives are the blessed API.
- `Jsx` root namespace.
- root exports of `jsx` and `Fragment`.
- `Renderer` public interface.
- `htmlRenderer` public value.
- `OrderedAttributes` public type.
- old ordered `attrs(...)` public helper.
- `mergeOrderedAttrs(...)` public helper.
- `AttributeEntry` / `AttributeInput` public types unless still required internally.
- `Attributes` / `AttributeValue` public names after replacement with `Props` / `PropValue`.
- `isOrderedAttributes`, `isRawHtml`, `isHtmlNode` public guards.
- `patchableNode(...)`.
- `requirePatchId(...)`.
- `MissingPatchIdError`.
- `mergeAttrs(...)` public name after replacement with `props(...)`.
- `mergeAttrsStrict(...)`.
- `AttributeConflictError`.

## Implementation work

- Rename the public HTML API to `h`, `render`, `fragment`, `raw`, `props`, and `page`.
- Change `HtmlNode` and `h(...)` to use plain `Props` unless an internal ordered representation is still necessary.
- Keep `props(...)` as the canonical way to compose HTML props/attrs with `ds.*` attrs.
- Remove duplicate prop/attribute composition helpers from Datastar/ds-facing modules.
- Remove public ordered-attribute and strict-merge APIs, or move them internal if tests still need them.
- Remove renderer docs and references to Runtime renderer services.
- Remove public patchable-ID helpers and update docs/tests to assert stable IDs/selectors directly.
- Move JSX exports to an explicit adapter/subpath or keep them source-local until package subpaths are introduced.
- Rewrite TSX docs/examples to say JSX is experimental syntax over the same server HTML tree.
- Ensure examples use `h(...)` as the primary path.

## Acceptance criteria

- A small app can learn the HTML API from one example.
- The public HTML API is small and top-level.
- `props(...)` is the only blessed prop/attribute composition helper.
- JSX usage requires an explicit opt-in import and does not appear as core framework identity.
- No public renderer, ordered-attr, strict-merge, or patchable-ID helper remains unless a concrete implementation need is documented.
- Docs do not suggest a virtual DOM, component lifecycle, hydration, or client component model.

## Anti-goals

- Do not add component lifecycle semantics.
- Do not add virtual DOM concepts.
- Do not make JSX the framework's center of gravity.
- Do not expose adapter/extensibility interfaces before real adapters exist.
- Do not preserve old HTML helper names for compatibility.
