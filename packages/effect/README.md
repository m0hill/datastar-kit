# @datastar-kit/effect

Use [datastar-kit](https://datastar-kit.dev) in an [Effect](https://effect.website) HTTP app. It reads Datastar signals from the current request with an Effect `Schema`, and returns Datastar responses and SSE streams as Effect `HttpServerResponse`s.

It covers only the two edges of a request. Views, `state()`, `event.*`, and `data-*` attributes are plain values, so import them from `datastar-kit` as usual. Routing, serving, and runtime setup stay with Effect's `HttpRouter`.

## Install

```sh
npm i @datastar-kit/effect datastar-kit effect
```

`effect/http` is marked unstable and can change in minor releases, so this package supports one Effect minor at a time: `effect ~4.1.0`. It needs datastar-kit 0.8.0 or newer.

## Example

A todo list with validation and a live view. Views and state are plain datastar-kit; the adapter appears only in the routes.

```tsx
import { event, get, mod, post, state } from "datastar-kit"
import { read, reply } from "@datastar-kit/effect"
import { Context, Effect, Layer, PubSub, Ref, Schema, Stream } from "effect"
import { HttpRouter } from "effect/http"

// State and schema

const todoForm = state({ title: "", errors: { title: "" } })

const TodoInput = Schema.Struct({
  title: Schema.Trim.check(Schema.isMinLength(1, { message: "Enter a todo title" }))
})

// A service: todo storage plus a feed of changes

interface Todo {
  readonly id: number
  readonly title: string
}

class Todos extends Context.Service<
  Todos,
  {
    readonly list: Effect.Effect<readonly Todo[]>
    readonly add: (title: string) => Effect.Effect<void>
    readonly changes: Stream.Stream<readonly Todo[]>
  }
>()("app/Todos") {}

const TodosLive = Layer.effect(
  Todos,
  Effect.gen(function* () {
    const todos = yield* Ref.make<readonly Todo[]>([])
    const updates = yield* PubSub.unbounded<readonly Todo[]>()
    return {
      list: Ref.get(todos),
      add: (title) =>
        Ref.updateAndGet(todos, (list) => [...list, { id: list.length + 1, title }]).pipe(
          Effect.flatMap((list) => PubSub.publish(updates, list)),
          Effect.asVoid
        ),
      changes: Stream.fromPubSub(updates)
    }
  })
)

// Views: plain datastar-kit JSX

const TodoList = ({ todos }: { todos: readonly Todo[] }) => (
  <ul id="todos">
    {todos.map((todo) => (
      <li>{todo.title}</li>
    ))}
  </ul>
)

const TodoPage = ({ todos }: { todos: readonly Todo[] }) => (
  <main
    data-signals={mod(todoForm.defaults, { ifMissing: true })}
    data-init={get("/todos/live")}
  >
    <form data-on:submit={mod(post("/todos"), { prevent: true })}>
      <input data-bind={todoForm.refs.title} />
      <small data-text={todoForm.refs.errors.title} />
      <button type="submit">Add</button>
    </form>
    <TodoList todos={todos} />
  </main>
)

// Routes: the adapter at the edges

const page = Effect.gen(function* () {
  const todos = yield* Todos
  return yield* reply.page(<TodoPage todos={yield* todos.list} />, { title: "Todos" })
})

const add = Effect.gen(function* () {
  const input = yield* read.decode(TodoInput)
  const todos = yield* Todos
  yield* todos.add(input.title)
  return yield* reply.signals(todoForm.reset())
}).pipe(
  Effect.catchTag("SchemaError", (error) => {
    const { fields } = read.flattenError(error)
    return reply.signals(todoForm.patch({ errors: { title: fields.title?.[0] ?? "" } }))
  })
)

const live = Effect.gen(function* () {
  const todos = yield* Todos
  return yield* reply.stream(
    todos.changes.pipe(Stream.map((list) => event.patch(<TodoList todos={list} />))),
    { heartbeat: {} }
  )
})

const routes = Layer.mergeAll(
  HttpRouter.add("GET", "/", page),
  HttpRouter.add("POST", "/todos", add),
  HttpRouter.add("GET", "/todos/live", live)
).pipe(HttpRouter.provideRequest(TodosLive))

// Entry: Workers, Bun, Deno, or anything with fetch

const app = HttpRouter.toWebHandler(routes)

export default { fetch: (request: Request) => app.handler(request) }
```

Services reach routes through `HttpRouter.provideRequest(layer)`, which builds the layer once and shares it across requests.

## API

| API                                | Use                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| `read.signals`                     | Read the current request's Datastar signals, without a schema.                         |
| `read.decode(schema)`              | Read the signals and decode them with an Effect schema, reporting every invalid field. |
| `read.flattenError(error)`         | Group a `SchemaError`'s messages into `{ form, fields }` by dot path.                  |
| `read.SignalReadError`             | The signals were not JSON, or not a JSON object. `cause` is datastar-kit's error.      |
| `reply.page(body, options?)`       | A full HTML document.                                                                  |
| `reply.patch(elements, options?)`  | Patch elements into the page.                                                          |
| `reply.signals(value, options?)`   | Patch signals.                                                                         |
| `reply.remove(selector, options?)` | Remove elements.                                                                       |
| `reply.navigate(url, options?)`    | Navigate the browser to a safe URL. Fails with `NavigationError` for an unsafe one.    |
| `reply.NavigationError`            | The URL was malformed, non-HTTP(S), or cross-origin without being allowlisted.         |
| `reply.done()`                     | `204` for an action with nothing to patch.                                             |
| `reply.stream(events, options?)`   | An SSE response from a `Stream` of event chunks, with optional heartbeats.             |

Every `reply.*` returns an Effect of the same `Response` datastar-kit builds, converted with `HttpServerResponse.fromWeb`.
`read.signals` and `read.decode` take signals from the `datastar` query parameter for `GET` and `DELETE`, and from the JSON body otherwise, as datastar-kit's `read.signals` does. They read the body through Effect, so middleware that reads it first still works. A body that cannot be read fails with Effect's `HttpServerError`. Set statuses and headers with Effect's combinators, such as `HttpServerResponse.setStatus` and `HttpServerResponse.setHeader`.

## Streams and disconnects

`reply.stream` runs the stream with the services of the effect that creates the response. The stream must not fail: headers are sent before it runs, so handle or log its errors first, for example with `Stream.catch`. When the client disconnects, the stream is interrupted, so its finalizers run and subscriptions close, even while it is waiting for its next event. This works on every runtime and does not depend on `request.signal`. On Cloudflare Workers, give a stream that can sit idle a heartbeat: workerd cancels a request whose code is waiting on nothing, and the stream's finalizers do not run.
