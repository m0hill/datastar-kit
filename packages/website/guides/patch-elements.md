# Patch elements

Element patches are the core Datastar UI update. A handler renders HTML, Datastar Kit frames it as a `datastar-patch-elements` SSE event, and the browser runtime applies that HTML to the current document.

Most patches should use the default `outer` mode with stable top-level `id` attributes. Reach for other modes when you are targeting a container, inserting siblings, appending rows, or removing elements.

## Patch flow

1. A Datastar attribute runs an action such as `@post('/save')`.
2. The handler reads inputs, changes backend state, and renders HTML.
3. `reply.patch(...)` frames that HTML as a `datastar-patch-elements` event.
4. Datastar finds the target element and applies the selected patch mode.

For a default `outer` patch, send the new element directly:

```tsx
reply.patch(
  <section id="target" class="panel is-live">
    <h2>Server view</h2>
    <p>Fresh HTML from the handler.</p>
  </section>
)
```

Datastar Kit sends an event like this:

```text
event: datastar-patch-elements
data: elements <section id="target" class="panel is-live">
data: elements   <h2>Server view</h2>
data: elements   <p>Fresh HTML from the handler.</p>
data: elements </section>
```

The browser matches `#target` and morphs the existing element:

```diff
  <main id="app">
    <nav id="filters">...</nav>
-   <section id="target" class="panel">
-     <h2>Current view</h2>
-     <p>Rendered on page load.</p>
+   <section id="target" class="panel is-live">
+     <h2>Server view</h2>
+     <p>Fresh HTML from the handler.</p>
    </section>
    <footer id="status">Idle</footer>
  </main>
```

## Targets, payloads, and modes

A patch has three pieces:

- **Target** — the browser element Datastar will operate on.
- **Payload** — the server-rendered HTML sent in the patch event.
- **Mode** — the DOM operation that connects target and payload.

For ordinary component replacement, let the payload choose the target by its top-level `id`:

```tsx
const Count = () => <output id="count">{count}</output>

return reply.patch(<Count />)
```

Use `selector` when the patch target is not the returned element itself:

```tsx
reply.patch(<ModalBody />, { selector: '#modal-slot', mode: 'inner' })
reply.patch(<Toast id="saved" />, { selector: '#notifications', mode: 'prepend' })
reply.patch('', { selector: '#empty-state', mode: 'remove' })
```

| Mode | Target | Payload effect |
| --- | --- | --- |
| `outer` | Payload top-level `id`, or explicit `selector` | Morphs the target element itself. This is the default. |
| `inner` | `selector` | Morphs only the target's children. The target tag and attributes remain. |
| `replace` | Payload top-level `id`, or explicit `selector` | Replaces the selected element without morphing. |
| `prepend` | `selector` | Inserts payload as the first child of the target. |
| `append` | `selector` | Inserts payload as the last child of the target. |
| `before` | `selector` | Inserts payload immediately before the target. |
| `after` | `selector` | Inserts payload immediately after the target. |
| `remove` | `selector` | Removes the target. Datastar Kit does not send an `elements` payload for this mode. |

## Mode examples

Use `inner` when a stable shell should keep its outer element:

```tsx
reply.patch(<PanelBody />, { selector: '#target', mode: 'inner' })
```

```diff
  <section id="target" class="panel">
-   <h2>Current view</h2>
-   <p>Rendered on page load.</p>
+   <h2>Server view</h2>
+   <p>Only the children are patched.</p>
  </section>
```

Use `append` or `prepend` when the payload belongs inside a container:

```tsx
reply.patch(<TodoItem todo={todo} />, { selector: '#todos', mode: 'append' })
```

```diff
  <ul id="todos">
    <li id="todo-1">Write docs</li>
+   <li id="todo-2">Ship example</li>
  </ul>
```

Use `before` or `after` when the payload belongs next to a known element:

```tsx
reply.patch(
  <p id="email-error" class="error">Enter a valid email.</p>,
  { selector: '#email', mode: 'after' }
)
```

```diff
  <label for="email">Email</label>
  <input id="email" name="email">
+ <p id="email-error" class="error">Enter a valid email.</p>
```

Use `remove` when the selected element should leave the document:

```tsx
reply.patch('', { selector: '#toast-saved', mode: 'remove' })
```

```text
event: datastar-patch-elements
data: selector #toast-saved
data: mode remove
```

## Stable IDs

Stable IDs are the patch contract. If a region can be refreshed from current backend state, give the top-level returned element a durable `id` and use that same `id` on the initial page and every later patch.

```tsx
const CartSummary = (props: { cart: Cart }) => (
  <aside id="cart-summary">
    <strong>{props.cart.total}</strong>
  </aside>
)

return reply.patch(<CartSummary cart={cart} />)
```

Do not generate a fresh id on every render. A changing id turns a predictable patch boundary into a new unrelated element.

## Direct responses

`reply.patch(...)` is the normal path because it sends an SSE patch event. `reply.directHtml(...)` can express the same patch options through Datastar direct-response headers, but it should stay an integration escape hatch:

```tsx
reply.directHtml(<TodoItem todo={todo} />, {
  selector: '#todos',
  mode: 'append'
})
```

Next: [Validation and errors](validation-and-errors.md). Related: [Actions and responses](actions-and-responses.md), [HTML and JSX](html-and-jsx.md), [Realtime streams](realtime.md).
