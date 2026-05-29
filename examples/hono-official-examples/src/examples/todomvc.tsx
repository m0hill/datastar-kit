import { Hono } from "hono"
import { ds, event, reply } from "datastar-kit"
import { ExampleLayout, pageHead } from "../layout.js"
import { readSignals } from "../helpers.js"

interface Todo {
  readonly id: number
  readonly text: string
  readonly completed: boolean
}

const initialTodos: readonly Todo[] = [
  { id: 1, text: "Learn any backend language", completed: false },
  { id: 2, text: "Learn Datastar", completed: false },
  { id: 3, text: "???", completed: true },
  { id: 4, text: "Profit", completed: false }
]

let nextId = 5
let mode = 0
let todos: Todo[] = initialTodos.map((todo) => ({
  id: todo.id,
  text: todo.text,
  completed: todo.completed
}))

const visibleTodos = () =>
  todos.filter((todo) => (mode === 1 ? !todo.completed : mode === 2 ? todo.completed : true))

const TodoItem = ({ todo }: { readonly todo: Todo }) => (
  <li class={todo.completed ? "completed" : undefined}>
    <label>
      <input
        type="checkbox"
        checked={todo.completed}
        {...ds.on("click", ds.post(`/examples/todomvc/${todo.id}/toggle`), { prevent: true })}
      />
      <span>{todo.text}</span>
    </label>
  </li>
)

const ModeButton = ({ value, label }: { readonly value: number; readonly label: string }) => (
  <button
    class={mode === value ? "small info" : "small"}
    {...ds.on("click", ds.put(`/examples/todomvc/mode/${value}`))}
  >
    {label}
  </button>
)

const TodoMvc = () => {
  const pending = todos.filter((todo) => !todo.completed).length
  const completed = todos.length - pending
  const allCompleted = todos.length > 0 && pending === 0

  return (
    <section
      id="todomvc"
      class="todo-shell"
      {...ds.dataSignals({ input: "" }, { ifMissing: true })}
    >
      <header class="todo-header">
        <input
          type="checkbox"
          checked={allCompleted}
          aria-label="Toggle all todos"
          {...ds.on("click", ds.post("/examples/todomvc/-1/toggle"), { prevent: true })}
        />
        <input
          id="new-todo"
          type="text"
          placeholder="What needs to be done?"
          {...ds.bind("input")}
          {...ds.on(
            "keydown",
            ds.expr(
              "evt.key === 'Enter' && $input.trim() && @patch('/examples/todomvc/-1') && ($input = '')"
            )
          )}
        />
      </header>
      <ul class="todo-list">
        {visibleTodos().map((todo) => (
          <TodoItem todo={todo} />
        ))}
      </ul>
      <div class="todo-actions">
        <span>
          <strong>{pending}</strong> items pending
        </span>
        <ModeButton value={0} label="All" />
        <ModeButton value={1} label="Pending" />
        <ModeButton value={2} label="Completed" />
        <button
          class="error small"
          disabled={completed === 0}
          {...ds.on("click", ds.delete("/examples/todomvc/completed"))}
        >
          Delete
        </button>
        <button class="warning small" {...ds.on("click", ds.put("/examples/todomvc/reset"))}>
          Reset
        </button>
      </div>
    </section>
  )
}

const patchTodos = () => reply.patch(<TodoMvc />)

export const example = new Hono()

example.get("/", () =>
  reply.page(
    <ExampleLayout
      title="TodoMVC"
      slug="todomvc"
      summary="Implements the classic TodoMVC interactions with server-owned state and Datastar patches."
      source="https://data-star.dev/examples/todomvc"
    >
      <TodoMvc />
    </ExampleLayout>,
    {
      title: "TodoMVC - Datastar Kit",
      head: pageHead()
    }
  )
)

example.patch("/-1", async (c) => {
  const { input = "" } = await readSignals<{ input?: string }>(c.req.raw)
  const text = input.trim()
  if (text.length > 0) {
    todos = [...todos, { id: nextId, text, completed: false }]
    nextId += 1
  }
  return reply.stream([event.signals({ input: "" }), event.patch(<TodoMvc />)])
})

example.post("/-1/toggle", () => {
  const shouldComplete = todos.some((todo) => !todo.completed)
  todos = todos.map((todo) => ({ ...todo, completed: shouldComplete }))
  return patchTodos()
})

example.post("/:id/toggle", (c) => {
  const id = Number(c.req.param("id"))
  todos = todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo))
  return patchTodos()
})

example.put("/mode/:mode", (c) => {
  mode = Math.max(0, Math.min(2, Number(c.req.param("mode"))))
  return patchTodos()
})

example.delete("/completed", () => {
  todos = todos.filter((todo) => !todo.completed)
  return patchTodos()
})

example.put("/reset", () => {
  todos = initialTodos.map((todo) => ({
    id: todo.id,
    text: todo.text,
    completed: todo.completed
  }))
  nextId = 5
  mode = 0
  return reply.stream([event.signals({ input: "" }), event.patch(<TodoMvc />)])
})
