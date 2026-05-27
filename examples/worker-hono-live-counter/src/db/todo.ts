import { and, asc, eq, sql } from "drizzle-orm"
import { appState, todos, type Todo } from "./schema.js"
import type { Database } from "./index.js"

const TODO_STATE_KEY = "todos"

export interface TodosSnapshot {
  todos: Todo[]
  version: number
}

export async function readTodosSnapshot(db: Database): Promise<TodosSnapshot> {
  const state = await db
    .select({ version: appState.version })
    .from(appState)
    .where(eq(appState.key, TODO_STATE_KEY))
    .get()

  const rows = await db.select().from(todos).orderBy(asc(todos.createdAt), asc(todos.id)).all()

  return { todos: rows, version: state?.version ?? 0 }
}

// D1 rejects SQL BEGIN/SAVEPOINT from Worker code. Use D1/Drizzle batch for multi-statement
// writes so each mutation and version bump commits atomically.
export async function createTodo(db: Database, title: string) {
  const now = Date.now()

  await db.batch([
    db.insert(appState).values({ key: TODO_STATE_KEY, version: 0 }).onConflictDoNothing(),
    db.insert(todos).values({
      id: crypto.randomUUID(),
      title,
      completed: false,
      createdAt: now,
      updatedAt: now
    }),
    db
      .update(appState)
      .set({ version: sql`${appState.version} + 1` })
      .where(eq(appState.key, TODO_STATE_KEY))
  ])
}

export async function toggleTodo(db: Database, id: string): Promise<boolean> {
  const now = Date.now()
  const [update] = await db.batch([
    db
      .update(todos)
      .set({
        completed: sql`CASE ${todos.completed} WHEN 0 THEN 1 ELSE 0 END`,
        updatedAt: now
      })
      .where(eq(todos.id, id)),
    db
      .update(appState)
      .set({ version: sql`${appState.version} + 1` })
      .where(and(eq(appState.key, TODO_STATE_KEY), sql`changes() > 0`))
  ])

  return ((update as D1Response | undefined)?.meta.changes ?? 0) > 0
}

export async function deleteTodo(db: Database, id: string): Promise<boolean> {
  const [deleted] = await db.batch([
    db.delete(todos).where(eq(todos.id, id)),
    db
      .update(appState)
      .set({ version: sql`${appState.version} + 1` })
      .where(and(eq(appState.key, TODO_STATE_KEY), sql`changes() > 0`))
  ])

  return ((deleted as D1Response | undefined)?.meta.changes ?? 0) > 0
}
