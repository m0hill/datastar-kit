# T007 — Simplify the HTML and JSX boundary

## Status

`pending`

## Grill level

`3/5` — design cleanup with a recommended answer.

## Why this task exists

`src/html.ts` is a good small renderer, but it exposes implementation details and future-facing extension hooks. `src/jsx.ts` is also useful syntax sugar, but JSX can invite React mental models: components, props, lifecycle, and client state expectations.

The framework should keep server-rendered HTML simple and explicit.

## Recommended answer

Make `h(...)` and `render(...)` the conceptual default. Keep JSX only as experimental syntax sugar, not a primary framework identity.

## Keep candidates

- `h`
- `fragment`
- `rawHtml`
- `render`
- `htmlDocument`
- `datastarDocument` if `Client` remains public

## Removal/internal candidates

- `Renderer` public interface until adapter evidence exists
- `htmlRenderer`
- `OrderedAttributes`, `attrs`, `mergeOrderedAttrs` unless Datastar ordering truly requires public control
- `isOrderedAttributes`, `isRawHtml`, `isHtmlNode`
- `patchableNode`, `requirePatchId`, `MissingPatchIdError`
- `Jsx` root namespace if not intentionally experimental

## Implementation work

- Decide the minimal public HTML API.
- Move renderer/ordered-attribute internals behind unexported helpers if still needed.
- Keep raw HTML explicit and scary enough.
- Demote JSX in docs; do not present it as the primary authoring path.
- Update JSX tests to reflect experimental status or move them behind internal tests.

## Acceptance criteria

- Users can understand HTML rendering from one file and one example.
- JSX does not imply a component runtime.
- Renderer extensibility is not public unless a real adapter exists.
- Attribute ordering complexity is not exposed unless necessary.

## Anti-goals

- Do not add component lifecycle semantics.
- Do not add virtual DOM concepts.
- Do not make JSX the framework’s center of gravity.
