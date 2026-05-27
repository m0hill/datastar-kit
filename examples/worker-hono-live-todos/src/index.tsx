import { Hono } from "hono"
import { z } from "zod"
import { ds, event, read, reply } from "datastar-kit"
import { database } from "./db/index.js"
import { createTodo, deleteTodo, readTodos, toggleTodo } from "./db/todo.js"
import type { Todo } from "./db/schema.js"

export { LiveRoom } from "./realtime/hub.js"

const app = new Hono<{ Bindings: CloudflareBindings }>()

const CreateTodoSignals = z.object({
  title: z.string().trim().min(1, "Enter a todo title.")
})

const todoState = ds.state({
  title: "",
  _validation: {
    title: ""
  }
})

const TodoForm = () => (
  <form class="panel" {...ds.on("submit", ds.post("/todos"), { prevent: true })}>
    <label for="todo-title">New todo</label>
    <div class="new-todo-row">
      <input
        id="todo-title"
        type="text"
        placeholder="Ship the Datastar example"
        {...ds.bind(todoState.$.title)}
      />
      <button type="submit">Add</button>
    </div>
    <p
      class="error"
      {...ds.show(todoState.$._validation.title)}
      {...ds.text(todoState.$._validation.title)}
    ></p>
  </form>
)

const TodoList = ({ todos }: { readonly todos: readonly Todo[] }) => (
  <section id="todos" class="panel">
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
              {...ds.on("change", ds.patch(`/todos/${todo.id}/toggle`))}
            />
            <span class="todo-title">{todo.title}</span>
            <button
              type="button"
              class="secondary"
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
  <main {...todoState.attrs()} {...ds.init(ds.get("/live"))}>
    <header>
      <h1>Worker Hono live todos</h1>
      <p class="muted">
        D1 stores the todos. A named Durable Object room fans out Datastar SSE patches to open tabs.
      </p>
    </header>
    <TodoForm />
    <TodoList todos={todos} />
  </main>
)

app.get("/", async (c) => {
  const todos = await readTodos(database(c.env.DB))

  return reply.page(<TodosPage todos={todos} />, {
    title: "Worker Hono live todos",
    head: [
      <meta name="viewport" content="width=device-width, initial-scale=1" />,
      <link href="/styles.css" rel="stylesheet" />,
      <script
        type="module"
        src="https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.1/bundles/datastar.js"
      />
    ]
  })
})

app.get("/live", async (c) => {
  const todos = await readTodos(database(c.env.DB))
  return c.env.LIVE_ROOMS.getByName("todos").subscribe(event.patch(<TodoList todos={todos} />))
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
  const todos = await readTodos(db)

  c.executionCtx.waitUntil(
    c.env.LIVE_ROOMS.getByName("todos").publish(event.patch(<TodoList todos={todos} />))
  )

  return reply.stream([event.signals(todoState.reset()), event.patch(<TodoList todos={todos} />)])
})

app.patch("/todos/:id/toggle", async (c) => {
  const db = database(c.env.DB)
  const changed = await toggleTodo(db, c.req.param("id"))

  if (!changed) return reply.done()

  const todos = await readTodos(db)

  c.executionCtx.waitUntil(
    c.env.LIVE_ROOMS.getByName("todos").publish(event.patch(<TodoList todos={todos} />))
  )
  return reply.patch(<TodoList todos={todos} />)
})

app.delete("/todos/:id", async (c) => {
  const db = database(c.env.DB)
  const changed = await deleteTodo(db, c.req.param("id"))

  if (!changed) return reply.done()

  const todos = await readTodos(db)

  c.executionCtx.waitUntil(
    c.env.LIVE_ROOMS.getByName("todos").publish(event.patch(<TodoList todos={todos} />))
  )
  return reply.patch(<TodoList todos={todos} />)
})

app.notFound((c) => c.text("Not Found", 404))

export default app
