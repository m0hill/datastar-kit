import { Hono } from "hono"
import { z } from "zod"
import { ds, event, read, reply } from "datastar-kit"
import { database, type Database } from "./db/index.js"
import {
  createTodo,
  deleteTodo,
  readTodosSnapshot,
  toggleTodo,
  type TodosSnapshot
} from "./db/todo.js"
import type { Todo } from "./db/schema.js"
import { liveTodos, type VersionedDatastarEvents } from "./realtime/hub.js"

export { LiveTodos } from "./realtime/hub.js"

const DATASTAR_RUNTIME =
  "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"

const MAX_TITLE_LENGTH = 120

const app = new Hono<{ Bindings: CloudflareBindings }>()

const todoState = ds.state({
  title: "",
  liveReady: false,
  _validation: {
    title: ""
  }
})

const CreateTodoSignals = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Enter a todo title.")
    .max(MAX_TITLE_LENGTH, `Keep todos under ${MAX_TITLE_LENGTH} characters.`)
})

const todoEvents = (snapshot: TodosSnapshot): VersionedDatastarEvents => ({
  version: snapshot.version,
  events:
    event.signals(todoState.patch({ liveReady: true })) + event.patch(<TodoList todos={snapshot.todos} />)
})

async function publishTodos(env: CloudflareBindings, db: Database) {
  const snapshot = await readTodosSnapshot(db)
  await liveTodos(env).publish(todoEvents(snapshot))
}

const TodoForm = () => (
  <form
    id="todo-form"
    method="post"
    action="/todos"
    class="panel"
    {...ds.on("submit", ds.post("/todos"), { prevent: true })}
  >
    <label for="todo-title">New todo</label>
    <div class="new-todo-row">
      <input
        id="todo-title"
        name="title"
        type="text"
        maxlength={MAX_TITLE_LENGTH}
        autocomplete="off"
        placeholder="Ship the Datastar example"
        {...ds.bind(todoState.$.title)}
      />
      <button type="submit" disabled {...ds.dataAttr("disabled", ds.expr`!(${todoState.$.liveReady})`)}>
        Add
      </button>
    </div>
    <p class="error" {...ds.show(todoState.$._validation.title)} {...ds.text(todoState.$._validation.title)}></p>
    <p class="muted">The form enables after the Durable Object-backed live stream connects.</p>
  </form>
)

const TodoList = ({ todos }: { readonly todos: readonly Todo[] }) => (
  <section id="todos" class="panel" aria-live="polite">
    <h2>{todos.length === 1 ? "1 todo" : `${todos.length} todos`}</h2>
    {todos.length === 0 ? (
      <p class="muted">No todos yet. Add one above and every open tab will update.</p>
    ) : (
      <ul>
        {todos.map((todo) => (
          <li class={todo.completed ? "done" : undefined}>
            <input
              type="checkbox"
              checked={todo.completed}
              aria-label={`Mark ${todo.title} ${todo.completed ? "incomplete" : "complete"}`}
              {...ds.on("change", ds.patch(`/todos/${todo.id}/toggle`))}
            />
            <span class="todo-title">{todo.title}</span>
            <button
              type="button"
              class="secondary"
              aria-label={`Delete ${todo.title}`}
              {...ds.on("click", ds.delete(`/todos/${todo.id}`))}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    )}
  </section>
)

const TodosPage = ({ todos }: { readonly todos: readonly Todo[] }) => (
  <main {...todoState.attrs()} {...ds.init(ds.get("/live", { retry: "always", openWhenHidden: true }))}>
    <header>
      <h1>Worker Hono live todos</h1>
      <p class="muted">
        D1 stores the todos. A Durable Object only fans out Datastar SSE patches to open tabs.
      </p>
    </header>
    <TodoForm />
    <TodoList todos={todos} />
  </main>
)

app.get("/", async (c) => {
  const snapshot = await readTodosSnapshot(database(c.env.DB))

  return reply.page(<TodosPage todos={snapshot.todos} />, {
    title: "Worker Hono live todos",
    head: [
      <meta name="viewport" content="width=device-width, initial-scale=1" />,
      <link href="/styles.css" rel="stylesheet" />,
      <script type="module" src={DATASTAR_RUNTIME} />
    ]
  })
})

app.get("/live", async (c) => {
  const snapshot = await readTodosSnapshot(database(c.env.DB))
  return liveTodos(c.env).subscribe(todoEvents(snapshot))
})

app.post("/todos", async (c) => {
  const result = CreateTodoSignals.safeParse(await read.signals(c.req.raw))

  if (!result.success) {
    const { fieldErrors } = z.flattenError(result.error)
    return reply.signals(
      todoState.patch({ _validation: { title: fieldErrors.title?.[0] ?? "Enter a todo title." } })
    )
  }

  const db = database(c.env.DB)
  await createTodo(db, result.data.title)
  await publishTodos(c.env, db)

  return reply.signals(todoState.patch({ title: "", _validation: { title: "" } }))
})

app.patch("/todos/:id/toggle", async (c) => {
  const db = database(c.env.DB)
  const changed = await toggleTodo(db, c.req.param("id"))

  if (changed) await publishTodos(c.env, db)

  return reply.done()
})

app.delete("/todos/:id", async (c) => {
  const db = database(c.env.DB)
  const changed = await deleteTodo(db, c.req.param("id"))

  if (changed) await publishTodos(c.env, db)

  return reply.done()
})

app.notFound((c) => c.text("Not Found", 404))

export default app
