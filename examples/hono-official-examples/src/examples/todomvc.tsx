import { Hono } from "hono"
import { ds, event, reply, read } from "datastar-kit"
import { z } from "zod"
import { ExampleLayout, pageHead } from "../layout.js"

const schema = z.object({ input: z.string().default("") })

const state = ds.state({ input: "" })

interface Todo {
  text: string
  completed: boolean
}

const initialTodos: readonly Todo[] = [
  { text: "Learn any backend language", completed: true },
  { text: "Learn Datastar", completed: false },
  { text: "???", completed: false },
  { text: "Profit", completed: false }
]

const cloneTodo = (todo: Todo): Todo => ({
  text: todo.text,
  completed: todo.completed
})

let mode = 0
let editingIndex: number | undefined
let todos: Todo[] = initialTodos.map(cloneTodo)

const visibleTodos = () =>
  todos
    .map((todo, index) => ({ todo, index }))
    .filter(({ todo }) => (mode === 1 ? !todo.completed : mode === 2 ? todo.completed : true))

const TodoItem = ({ todo, index }: { todo: Todo; index: number }) => {
  if (editingIndex === index) {
    return (
      <li>
        <input
          id="edit-todo"
          type="text"
          {...ds.bind(state.$.input)}
          {...ds.init(ds.expr("el.focus()"))}
          {...ds.on("blur", ds.put("/examples/todomvc/cancel"))}
          {...ds.on(
            "keydown",
            ds.expr(`
              if (evt.key === 'Escape') {
                el.blur()
              } else if (evt.key === 'Enter' && $input.trim()) {
                @patch('/examples/todomvc/${index}')
              }
            `)
          )}
        />
      </li>
    )
  }

  return (
    <li
      class={todo.completed ? "completed" : undefined}
      role="button"
      tabindex="0"
      {...ds.on("dblclick", ds.expr(`evt.target === el && @get('/examples/todomvc/${index}')`))}
    >
      <input
        id={`todo-checkbox-${index}`}
        type="checkbox"
        {...ds.init(ds.expr(`el.checked = ${todo.completed}`))}
        {...ds.on("click", ds.post(`/examples/todomvc/${index}/toggle`), { prevent: true })}
      />
      <label for={`todo-checkbox-${index}`}>
        <span>{todo.text}</span>
      </label>
      <button class="error small" {...ds.on("click", ds.delete(`/examples/todomvc/${index}`))}>
        ×
      </button>
    </li>
  )
}

const ModeButton = ({ value, label }: { value: number; label: string }) => (
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
    <section id="todomvc" class="todo-shell" {...ds.init(ds.get("/examples/todomvc/updates"))}>
      <header id="todo-header" class="todo-header">
        <input
          type="checkbox"
          aria-label="Toggle all todos"
          {...ds.init(ds.expr(`el.checked = ${allCompleted}`))}
          {...ds.on("click", ds.post("/examples/todomvc/-1/toggle"), { prevent: true })}
        />
        <input
          id="new-todo"
          type="text"
          placeholder="What needs to be done?"
          {...(editingIndex === undefined
            ? {
                ...state.attrs(),
                ...ds.bind(state.$.input),
                ...ds.on(
                  "keydown",
                  ds.expr(
                    "evt.key === 'Enter' && $input.trim() && @patch('/examples/todomvc/-1') && ($input = '')"
                  )
                )
              }
            : {})}
        />
      </header>
      <ul id="todo-list" class="todo-list">
        {visibleTodos().map(({ todo, index }) => (
          <TodoItem todo={todo} index={index} />
        ))}
      </ul>
      <div id="todo-actions" class="todo-actions">
        <span>
          <strong>{pending}</strong> items pending
        </span>
        <ModeButton value={0} label="All" />
        <ModeButton value={1} label="Pending" />
        <ModeButton value={2} label="Completed" />
        <button
          class="error small"
          disabled={completed === 0}
          {...ds.on("click", ds.delete("/examples/todomvc/-1"))}
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

example.get("/updates", () => patchTodos())

example.patch("/-1", async (c) => {
  const { input } = schema.parse(await read.signals(c.req.raw))
  const text = input.trim()
  if (text.length > 0) {
    todos = [...todos, { text, completed: false }]
  }
  editingIndex = undefined
  return reply.stream([event.signals(state.reset()), event.patch(<TodoMvc />)])
})

example.post("/-1/toggle", () => {
  const shouldComplete = todos.some((todo) => !todo.completed)
  for (const todo of todos) {
    todo.completed = shouldComplete
  }
  editingIndex = undefined
  return patchTodos()
})

example.post("/:id/toggle", (c) => {
  const index = Number(c.req.param("id"))
  const todo = todos[index]
  if (todo !== undefined) {
    todo.completed = !todo.completed
  }
  editingIndex = undefined
  return patchTodos()
})

example.get("/:id", (c) => {
  const index = Number(c.req.param("id"))
  const todo = todos[index]
  if (todo !== undefined) {
    editingIndex = index
    return reply.stream([
      event.signals(state.reset({ input: todo.text })),
      event.patch(<TodoMvc />)
    ])
  }
  return patchTodos()
})

example.patch("/:id", async (c) => {
  const index = Number(c.req.param("id"))
  const { input } = schema.parse(await read.signals(c.req.raw))
  const text = input.trim()
  const todo = todos[index]
  if (text.length > 0 && todo !== undefined) {
    todo.text = text
  }
  editingIndex = undefined
  return reply.stream([event.signals(state.reset()), event.patch(<TodoMvc />)])
})

example.put("/cancel", () => {
  editingIndex = undefined
  return reply.stream([event.signals(state.reset()), event.patch(<TodoMvc />)])
})

example.put("/mode/:mode", (c) => {
  mode = Math.max(0, Math.min(2, Number(c.req.param("mode"))))
  editingIndex = undefined
  return patchTodos()
})

example.delete("/-1", () => {
  todos = todos.filter((todo) => !todo.completed)
  editingIndex = undefined
  return patchTodos()
})

example.delete("/:id", (c) => {
  const index = Number(c.req.param("id"))
  todos = todos.filter((_, todoIndex) => todoIndex !== index)
  editingIndex = undefined
  return patchTodos()
})

example.put("/reset", () => {
  todos = initialTodos.map(cloneTodo)
  mode = 0
  editingIndex = undefined
  return reply.stream([event.signals(state.reset()), event.patch(<TodoMvc />)])
})
