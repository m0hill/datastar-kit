/** @jsx jsx */
/** @jsxFrag Fragment */
import { serve, type ServerType } from "@hono/node-server"
import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { compress } from "hono/compress"
import { pathToFileURL } from "node:url"
import * as z from "zod"
import { ds, render, reply, type Child } from "../src/index.js"
import { Fragment, jsx } from "../src/jsx.js"
import { patchElements, patchSignals } from "../src/sse.js"
import { DATASTAR_CDN } from "./counter.js"

const TAILWIND_CDN = "https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"

export const CreateTodoSchema = z.object({
  title: z.string().trim().min(1, "Add a todo first").max(120, "Keep todos under 120 characters")
})

const TodoParamSchema = z.object({
  id: z.string().uuid()
})

export interface Todo {
  readonly id: string
  readonly title: string
  readonly completed: boolean
  readonly createdAt: string
}

interface Subscriber {
  queued: number
  closed: boolean
  resolve?: (() => void) | undefined
}

class InvalidationBus {
  readonly #subscribers = new Set<Subscriber>()
  #closed = false

  publish(): void {
    if (this.#closed) return

    for (const subscriber of this.#subscribers) {
      if (subscriber.resolve !== undefined) {
        const resolve = subscriber.resolve
        subscriber.resolve = undefined
        resolve()
      } else {
        subscriber.queued += 1
      }
    }
  }

  close(): void {
    if (this.#closed) return
    this.#closed = true

    for (const subscriber of this.#subscribers) {
      subscriber.closed = true
      subscriber.resolve?.()
    }
  }

  subscribe(): AsyncIterable<void> {
    const subscriber: Subscriber = { queued: 0, closed: this.#closed }
    const subscribers = this.#subscribers
    subscribers.add(subscriber)

    return {
      async *[Symbol.asyncIterator]() {
        try {
          while (!subscriber.closed) {
            if (subscriber.queued > 0) {
              subscriber.queued -= 1
              yield undefined
              continue
            }

            await new Promise<void>((resolve) => {
              subscriber.resolve = resolve
            })
            subscriber.resolve = undefined

            if (!subscriber.closed) yield undefined
          }
        } finally {
          subscriber.closed = true
          subscribers.delete(subscriber)
        }
      }
    }
  }
}

class TodoStore {
  #todos: Todo[] = []

  all(): readonly Todo[] {
    return this.#todos
  }

  create(title: string): Todo {
    const todo = {
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: new Date().toISOString()
    }
    this.#todos = [todo, ...this.#todos]
    return todo
  }

  toggle(id: string): Todo | undefined {
    let updated: Todo | undefined
    this.#todos = this.#todos.map((todo) => {
      if (todo.id !== id) return todo
      updated = { ...todo, completed: !todo.completed }
      return updated
    })
    return updated
  }

  delete(id: string): boolean {
    const before = this.#todos.length
    this.#todos = this.#todos.filter((todo) => todo.id !== id)
    return this.#todos.length !== before
  }
}

const pageHead = (): readonly Child[] => [
  <meta charset="UTF-8" />,
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />,
  <script type="module" src={DATASTAR_CDN}></script>,
  <script src={TAILWIND_CDN}></script>,
  <style type="text/tailwindcss">{`
@theme {
  --color-clifford: #da373d;
}
`}</style>
]

const ErrorMessage = ({ message = "" }: { readonly message?: string }) =>
  <p
    id="todo-errors"
    role="alert"
    className={message.length === 0 ? "min-h-6 text-sm" : "min-h-6 text-sm font-medium text-clifford"}
  >
    {message}
  </p>

const EmptyState = () =>
  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center text-slate-400">
    <p className="text-lg font-medium text-slate-200">No todos yet</p>
    <p className="mt-2 text-sm">Add one above and every connected browser will sync in real time.</p>
  </div>

const TodoItem = ({ todo }: { readonly todo: Todo }) =>
  <li
    id={`todo-${todo.id}`}
    className="flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-3 shadow-lg shadow-slate-950/20"
  >
    <button
      type="button"
      className={todo.completed
        ? "grid size-9 place-items-center rounded-full bg-emerald-400 text-slate-950"
        : "grid size-9 place-items-center rounded-full border border-slate-600 text-slate-300 hover:border-emerald-300"}
      aria-label={todo.completed ? "Mark todo incomplete" : "Mark todo complete"}
      aria-pressed={String(todo.completed)}
      {...ds.on("click", ds.post(`/todos/${todo.id}/toggle`))}
    >
      {todo.completed ? "✓" : ""}
    </button>
    <span className={todo.completed ? "flex-1 truncate text-slate-500 line-through decoration-2" : "flex-1 truncate text-slate-100"}>
      {todo.title}
    </span>
    <button
      type="button"
      className="rounded-full px-3 py-1 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-clifford"
      {...ds.on("click", ds.delete(`/todos/${todo.id}`))}
    >
      Delete
    </button>
  </li>

export const todoListNode = (todos: readonly Todo[]): Child => {
  const open = todos.filter((todo) => !todo.completed).length
  return (
    <section id="todo-sync-list" className="space-y-4">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <span>{todos.length} total</span>
        <span>{open} open</span>
      </div>
      {todos.length === 0 ? <EmptyState /> : <ul className="space-y-3">{todos.map((todo) => <TodoItem todo={todo} />)}</ul>}
    </section>
  )
}

export const todoPageNode = (todos: readonly Todo[] = []): Child => {
  const title = ds.signal<string, "title">("title")

  return (
    <main
      id="todo-sync-app"
      className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100"
      {...ds.dataSignals({ title: "" }, { ifMissing: true })}
      {...ds.init(ds.get("/todos/live"))}
    >
      <section className="mx-auto max-w-3xl space-y-8">
        <header className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-clifford">Datastar + Hono</p>
          <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Realtime todo sync</h1>
          <p className="mx-auto max-w-2xl text-slate-400">
            A full-stack Hono example with Zod validation, compressed HTML responses, Tailwind browser styles, and SSE updates shared across tabs.
          </p>
        </header>
        <form
          className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-slate-950/30"
          {...ds.on("submit", ds.post("/todos", { payload: { title } }), { prevent: true })}
        >
          <label className="sr-only" for="new-todo">New todo</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="new-todo"
              name="title"
              autocomplete="off"
              placeholder="Ship the Web Standards SDK"
              className="min-h-12 flex-1 rounded-2xl border border-slate-700 bg-slate-950 px-4 text-slate-100 outline-none ring-clifford/30 placeholder:text-slate-500 focus:border-clifford focus:ring-4"
              {...ds.bind(title)}
            />
            <button
              type="submit"
              className="min-h-12 rounded-2xl bg-clifford px-6 font-bold text-white shadow-lg shadow-clifford/20 hover:bg-red-500"
            >
              Add todo
            </button>
          </div>
          <ErrorMessage />
        </form>
        {todoListNode(todos)}
      </section>
    </main>
  )
}

const todoListPatch = (todos: readonly Todo[]): string =>
  patchElements(render(todoListNode(todos)), { selector: "#todo-sync-list", mode: "outer" })

const validationResponse = (message: string): Response =>
  reply.patch(<ErrorMessage message={message} />, { selector: "#todo-errors", mode: "outer" })

const createSuccessResponse = (): Response =>
  reply.stream([
    patchSignals({ title: "" }),
    patchElements(render(<ErrorMessage />), { selector: "#todo-errors", mode: "outer" })
  ])

const notFound = (): Response => new Response("Todo not found", { status: 404 })

export const makeTodoSync = () => {
  const app = new Hono()
  const bus = new InvalidationBus()
  const store = new TodoStore()

  app.use(compress())

  app.get("/", () =>
    reply.page({
      head: pageHead(),
      body: todoPageNode(store.all())
    })
  )

  app.get("/todos/live", () => {
    async function* events(): AsyncIterable<string> {
      const subscription = bus.subscribe()
      yield todoListPatch(store.all())
      for await (const _ of subscription) {
        yield todoListPatch(store.all())
      }
    }

    return reply.stream(events(), { heartbeat: { intervalMs: 15_000, comment: "todos" } })
  })

  app.post(
    "/todos",
    zValidator("json", CreateTodoSchema, (result) => {
      if (!result.success) return validationResponse(result.error.issues[0]?.message ?? "Invalid todo")
    }),
    (context) => {
      const { title } = context.req.valid("json")
      store.create(title)
      bus.publish()
      return createSuccessResponse()
    }
  )

  app.post(
    "/todos/:id/toggle",
    zValidator("param", TodoParamSchema),
    (context) => {
      const todo = store.toggle(context.req.valid("param").id)
      if (todo === undefined) return notFound()
      bus.publish()
      return reply.done()
    }
  )

  app.delete(
    "/todos/:id",
    zValidator("param", TodoParamSchema),
    (context) => {
      if (!store.delete(context.req.valid("param").id)) return notFound()
      bus.publish()
      return reply.done()
    }
  )

  return {
    app,
    handle: (request: Request): Response | Promise<Response> => app.fetch(request),
    shutdown: () => bus.close(),
    currentTodos: (): readonly Todo[] => store.all()
  }
}

export interface TodoSyncServerOptions {
  readonly host?: string
  readonly port?: number
}

export interface RunningTodoSyncServer {
  readonly todoSync: ReturnType<typeof makeTodoSync>
  readonly server: ServerType
  readonly close: () => Promise<void>
}

const closeServer = (server: ServerType): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => error === undefined ? resolve() : reject(error))
  })

export const startTodoSyncServer = async (options: TodoSyncServerOptions = {}): Promise<RunningTodoSyncServer> => {
  const todoSync = makeTodoSync()
  const host = options.host ?? "127.0.0.1"
  const port = options.port ?? 3000
  let ready!: () => void
  const listening = new Promise<void>((resolve) => {
    ready = resolve
  })
  const server = serve({ fetch: todoSync.handle, hostname: host, port }, (info) => {
    console.log(`ts-star todo-sync example listening on http://${host}:${info.port}`)
    ready()
  })
  await listening

  return {
    todoSync,
    server,
    close: async () => {
      await closeServer(server)
      todoSync.shutdown()
    }
  }
}

export const main = async (): Promise<void> => {
  const running = await startTodoSyncServer({
    host: process.env.HOST ?? "127.0.0.1",
    port: Number(process.env.PORT ?? "3000")
  })

  const shutdownServer = async () => {
    await running.close()
    process.exit(0)
  }

  process.once("SIGINT", shutdownServer)
  process.once("SIGTERM", shutdownServer)
}

const defaultTodoSync = makeTodoSync()

export const app = defaultTodoSync.app
export const handle = (request: Request): Response | Promise<Response> => defaultTodoSync.handle(request)
export const shutdown = (): void => defaultTodoSync.shutdown()
export const currentTodos = (): readonly Todo[] => defaultTodoSync.currentTodos()
export type AppType = typeof app

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  void main().catch((error: unknown) => {
    console.error(error)
    process.exit(1)
  })
}
