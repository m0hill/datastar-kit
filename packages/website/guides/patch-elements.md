<script setup>
import PatchElementsVisual from '../.vitepress/components/PatchElementsVisual.vue'
</script>

# Patch elements

Element patches are the core Datastar UI update. A handler renders HTML, Datastar Kit frames that HTML as a `datastar-patch-elements` event, and the browser runtime applies the patch to the current document.

Most patches should use the default `outer` mode with stable top-level `id` attributes. Reach for the other modes when you are targeting a container, inserting siblings, appending rows, or removing elements.

<PatchElementsVisual />

## Mental model

A patch has three pieces:

- **target** — the browser element Datastar will operate on;
- **payload** — the server-rendered HTML sent in the patch event;
- **mode** — the DOM operation that connects the target and payload.

For default component updates, the payload chooses the target by its top-level `id`:

```tsx
const Count = () => <output id="count">{count}</output>

return reply.patch(<Count />)
```

Datastar sees the returned `id="count"` and morphs the existing `#count` element. This is the preferred shape for current-state views because the same view can be rendered on the initial page, after an action, or after a live-stream reconnect.

Use an explicit `selector` when the patch target is not the returned element itself:

```tsx
reply.patch(<TodoItem todo={todo} />, { selector: '#todos', mode: 'append' })
reply.patch('', { selector: '#empty-state', mode: 'remove' })
reply.patch(<ModalBody />, { selector: '#modal-slot', mode: 'inner' })
```

## Modes

| Mode | Target | Payload effect |
| --- | --- | --- |
| `outer` | Matched by top-level payload `id`, or by `selector` | Morphs the target element itself. This is the default and recommended mode. |
| `inner` | `selector` | Morphs only the target's children. The target tag and attributes remain. |
| `replace` | Matched by payload `id`, or by `selector` | Replaces the selected element without morphing. |
| `prepend` | `selector` | Inserts payload as the first child of the target. |
| `append` | `selector` | Inserts payload as the last child of the target. |
| `before` | `selector` | Inserts payload as a sibling immediately before the target. |
| `after` | `selector` | Inserts payload as a sibling immediately after the target. |
| `remove` | `selector` | Removes the target. Datastar Kit does not send an `elements` payload for this mode. |

## Choosing a Mode

Use `outer` for ordinary component replacement:

```tsx
const ProjectList = (props: { projects: Project[] }) => (
  <section id="project-list">
    {props.projects.map((project) => <ProjectRow project={project} />)}
  </section>
)

return reply.patch(<ProjectList projects={projects} />)
```

Use `inner` when a stable container should keep its outer element:

```tsx
return reply.patch(
  <ProjectRows projects={projects} />,
  { selector: '#project-list', mode: 'inner' }
)
```

Use `append` and `prepend` for list-style additions:

```tsx
return reply.patch(
  <TodoItem todo={todo} />,
  { selector: '#todos', mode: 'append' }
)
```

Use `before` and `after` when the new HTML belongs next to a known element:

```tsx
return reply.patch(
  <p id="email-error" class="error">Enter a valid email.</p>,
  { selector: '#email', mode: 'after' }
)
```

Use `remove` for deletion and dismissal:

```tsx
return reply.patch('', { selector: '#toast-saved', mode: 'remove' })
```

## Stable IDs

Stable IDs are the patch contract. If a region can be refreshed as current backend state, give the top-level returned element a durable `id` and keep using that same `id` on the initial page and every later patch.

```tsx
const CartSummary = (props: { cart: Cart }) => (
  <aside id="cart-summary">
    <strong>{props.cart.total}</strong>
  </aside>
)

return reply.patch(<CartSummary cart={cart} />)
```

Do not generate a fresh id on every render. A changing id turns a predictable patch boundary into a new unrelated element.

## Direct Responses

`reply.patch(...)` is the normal path because it sends an SSE patch event. `reply.directHtml(...)` can express the same patch options through Datastar direct-response headers, but it should stay an integration escape hatch:

```tsx
reply.directHtml(<TodoItem todo={todo} />, {
  selector: '#todos',
  mode: 'append'
})
```

Next: [Validation and errors](validation-and-errors.md). Related: [Actions and responses](actions-and-responses.md), [HTML and JSX](html-and-jsx.md), [Realtime streams](realtime.md).
