# T003 — Design the backend-state and CQRS programming model

## Status

`pending`

## Why this task exists

The core philosophical question for `ts-star` is whether it is merely a set of Datastar helpers or a framework with a recommended way to build applications.

The recommended Datastar philosophy is backend-driven UI:

- backend owns source-of-truth state;
- commands mutate backend state;
- the server patches elements/signals back to the browser;
- signals are used sparingly;
- fat morphs are preferred over fine-grained client state management.

`ts-star` needs to encode this as a programming model.

## Target outcome

Define a first-class model for:

- pages/views;
- command handlers;
- query/render handlers;
- live queries over SSE;
- state invalidation;
- patching current views rather than streaming fragile deltas.

## Recommended model

Use CQRS as the default mental model:

1. **Page load** renders a shell or full initial page.
2. **Commands** receive user intent, validate input, mutate backend state, and return either:
   - `204 No Content`, or
   - a Datastar patch for validation/error/local feedback.
3. **Queries/live queries** render current backend state and patch elements.
4. **Realtime** uses invalidation or current-state snapshots, not arbitrary event deltas.

The core invariant:

> The UI should be recoverable by rendering current backend state.

## Possible API sketch

This is illustrative, not final:

```ts
const page = Page.make({
  path: "/todos",
  state: loadTodos,
  render: (state) => todosView(state),
  commands: {
    add: Command.schema(AddTodo).handle(({ input }) => ...),
    toggle: Command.schema(ToggleTodo).handle(({ input }) => ...)
  },
  live: LiveQuery.invalidateOn(TodoEvents).renderCurrent()
})
```

The point is not this exact syntax. The point is that commands and live rendering have a blessed relationship.

## Implementation work

- Write a design doc for the programming model.
- Create a minimal `Page` or `Resource` abstraction only after the design is clear.
- Define how commands are routed and how action URLs are generated.
- Define how a live query subscribes to invalidations and rerenders current state.
- Define whether initial render is full page or shell + `data-init` fetch.
- Decide how much state, if any, framework runtime stores per connection.

## Important reference ideas

Borrow from `hyperlith`:

- fat/main morph by default;
- command routes do not directly own the view update unless returning validation feedback;
- render current state on connect/reconnect;
- batching and compression make large HTML patches viable.

Borrow cautiously from `stube`:

- effect/fragment boundary is useful;
- full conversation/session kernel is likely too heavy unless intentionally chosen.

## Acceptance criteria

- Framework docs clearly distinguish commands from queries/live queries.
- At least one example follows the model end-to-end.
- Realtime examples do not require clients to receive every event delta correctly.
- There is a clear answer to: “Where does application state live?”

## Anti-goals

- Do not build a client-side store.
- Do not build a frontend router/history manager.
- Do not require a conversation/session kernel for normal apps.
